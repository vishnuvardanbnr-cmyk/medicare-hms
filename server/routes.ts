import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { authenticateUser, createUser, getUserByEmail, getUserById, hashPassword, verifyPassword } from "./auth";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { seedDatabase } from "./seed";

const PgStore = connectPgSimple(session);

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Session setup with PostgreSQL store for reliable session persistence
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    store: new PgStore({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true
    }),
    resave: false,
    saveUninitialized: false,
    cookie: { 
      httpOnly: true, 
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: isProduction ? 'lax' : 'lax'
    },
    proxy: !isProduction
  }));

  // Trust proxy in development for proper session handling
  if (!isProduction) {
    app.set('trust proxy', 1);
  }

  // Auth middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    next();
  };

  // Role-based access control middleware
  const requireRole = (...roles: string[]) => async (req: any, res: any, next: any) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await getUserById(req.session.userId);
    if (!user || !roles.includes(user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };

  // ============ AUTH ENDPOINTS ============
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name, role } = z.object({ 
        email: z.string().email(), 
        password: z.string().min(6), 
        name: z.string().min(2),
        role: z.string().optional()
      }).parse(req.body);
      const existing = await getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "Email already exists" });
      const user = await createUser(email, password, name, role || "staff");
      (req.session as any).userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
      });
    } catch (err) {
      console.error("Signup error:", err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: (err as any).message || "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
      const user = await authenticateUser(email, password);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });
      (req.session as any).userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        res.json(user);
      });
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: (err as any).message || "Login failed" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await getUserById((req.session as any).userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive ?? true });
    } catch (err) {
      console.error("Get user error:", err);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ message: "Logged out" }));
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }).parse(req.body);
      
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) return res.status(400).json({ message: "Current password is incorrect" });
      
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error("Change password error:", err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // ============ SEED DATABASE ============
  app.post("/api/seed", async (req, res) => {
    try {
      await seedDatabase();
      res.json({ message: "Database seeded successfully" });
    } catch (err) {
      console.error("Seed error:", err);
      res.status(500).json({ message: "Failed to seed database" });
    }
  });

  // ============ DEPARTMENTS ============
  app.get(api.departments.list.path, async (req, res) => res.json(await storage.getDepartments()));
  app.post(api.departments.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createDepartment(api.departments.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.departments.get.path, async (req, res) => {
    const dept = await storage.getDepartment(Number(req.params.id));
    if (!dept) return res.status(404).json({ message: "Department not found" });
    res.json(dept);
  });
  app.put(api.departments.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateDepartment(Number(req.params.id), api.departments.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ DOCTORS ============
  app.get(api.doctors.list.path, async (req, res) => res.json(await storage.getDoctors()));
  app.post(api.doctors.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createDoctor(api.doctors.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.doctors.get.path, async (req, res) => {
    const doc = await storage.getDoctor(Number(req.params.id));
    if (!doc) return res.status(404).json({ message: "Doctor not found" });
    res.json(doc);
  });
  app.put(api.doctors.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateDoctor(Number(req.params.id), api.doctors.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.doctors.byDepartment.path, async (req, res) => res.json(await storage.getDoctorsByDepartment(Number(req.params.id))));

  // ============ PATIENTS (OP Registration) ============
  app.get(api.patients.list.path, async (req, res) => res.json(await storage.getPatients()));
  app.post(api.patients.create.path, async (req, res) => {
    try {
      const data = req.body;
      if (!data.patientUid) {
        data.patientUid = `PAT${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }
      res.status(201).json(await storage.createPatient(api.patients.create.input.parse(data)));
    }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.patients.get.path, isAuthenticated, async (req, res) => {
    const pat = await storage.getPatient(Number(req.params.id));
    if (!pat) return res.status(404).json({ message: "Patient not found" });
    res.json(pat);
  });
  app.put(api.patients.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updatePatient(Number(req.params.id), api.patients.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.patients.search.path, isAuthenticated, async (req, res) => {
    const query = (req.query.q as string) || "";
    res.json(await storage.searchPatients(query));
  });
  app.get(api.patients.byUid.path, isAuthenticated, async (req, res) => {
    const pat = await storage.getPatientByUid(req.params.uid);
    if (!pat) return res.status(404).json({ message: "Patient not found" });
    res.json(pat);
  });

  // ============ OP TOKENS ============
  app.get(api.opTokens.list.path, isAuthenticated, async (req, res) => res.json(await storage.getOpTokens()));
  app.post(api.opTokens.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createOpToken(api.opTokens.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.opTokens.get.path, isAuthenticated, async (req, res) => {
    const token = await storage.getOpToken(Number(req.params.id));
    if (!token) return res.status(404).json({ message: "Token not found" });
    res.json(token);
  });
  app.put(api.opTokens.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateOpToken(Number(req.params.id), api.opTokens.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.opTokens.byDoctor.path, isAuthenticated, async (req, res) => {
    const date = req.query.date as string | undefined;
    res.json(await storage.getOpTokensByDoctor(Number(req.params.id), date));
  });
  app.get(api.opTokens.byPatient.path, isAuthenticated, async (req, res) => res.json(await storage.getOpTokensByPatient(Number(req.params.id))));

  // ============ APPOINTMENTS ============
  app.get(api.appointments.list.path, async (req, res) => res.json(await storage.getAppointments()));
  app.post(api.appointments.create.path, async (req, res) => {
    try {
      const data = api.appointments.create.input.parse(req.body);
      
      // Auto-assign queue position based on doctor's appointments for the same date
      const appointmentDate = new Date(data.date);
      const dateStr = appointmentDate.toISOString().split('T')[0];
      const existingAppointments = await storage.getAppointmentsByDoctor(data.doctorId, dateStr);
      const queuePosition = existingAppointments.filter(a => a.status === 'scheduled').length + 1;
      
      const appointment = await storage.createAppointment({ ...data, queuePosition });
      
      // Create notification for the assigned doctor
      const patient = await storage.getPatient(data.patientId);
      const patientName = patient?.name || "Unknown Patient";
      const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
      });
      
      await storage.createNotification({
        recipientDoctorId: data.doctorId,
        type: "appointment",
        title: "New Appointment",
        message: `New appointment with ${patientName} on ${formattedDate}. Reason: ${data.reason}`,
        relatedId: appointment.id,
        relatedType: "appointment",
        isRead: false,
      });
      
      res.status(201).json(appointment);
    }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.appointments.get.path, isAuthenticated, async (req, res) => {
    const apt = await storage.getAppointment(Number(req.params.id));
    if (!apt) return res.status(404).json({ message: "Appointment not found" });
    res.json(apt);
  });
  app.put(api.appointments.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateAppointment(Number(req.params.id), api.appointments.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.appointments.byDoctor.path, isAuthenticated, async (req, res) => {
    const date = req.query.date as string | undefined;
    res.json(await storage.getAppointmentsByDoctor(Number(req.params.id), date));
  });
  app.get(api.appointments.byPatient.path, isAuthenticated, async (req, res) => res.json(await storage.getAppointmentsByPatient(Number(req.params.id))));

  // ============ VITALS ============
  app.get(api.vitals.list.path, isAuthenticated, async (req, res) => res.json(await storage.getPatientVitals(Number(req.params.id))));
  app.post(api.vitals.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createPatientVitals(api.vitals.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.vitals.latest.path, isAuthenticated, async (req, res) => {
    const vitals = await storage.getLatestVitals(Number(req.params.id));
    if (!vitals) return res.status(404).json({ message: "No vitals found" });
    res.json(vitals);
  });

  // ============ PRESCRIPTIONS ============
  app.get(api.prescriptions.list.path, async (req, res) => res.json(await storage.getPrescriptions()));
  app.post(api.prescriptions.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createPrescription(api.prescriptions.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.prescriptions.get.path, isAuthenticated, async (req, res) => {
    const prx = await storage.getPrescription(Number(req.params.id));
    if (!prx) return res.status(404).json({ message: "Prescription not found" });
    res.json(prx);
  });
  app.put(api.prescriptions.update.path, isAuthenticated, async (req, res) => {
    try {
      const updateData = api.prescriptions.update.input.parse(req.body);
      
      // Guard: Block dispensing if prescription is not paid
      if (updateData.isDispensed === true) {
        const prescription = await storage.getPrescription(Number(req.params.id));
        if (prescription && prescription.paymentStatus !== 'paid') {
          return res.status(400).json({ message: "Cannot dispense: Prescription must be paid first" });
        }
      }
      
      res.json(await storage.updatePrescription(Number(req.params.id), updateData));
    }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.prescriptions.byPatient.path, isAuthenticated, async (req, res) => res.json(await storage.getPrescriptionsByPatient(Number(req.params.id))));
  
  // Prescription payment status filtering for pharmacy
  app.get("/api/prescriptions/by-payment-status/:status", async (req, res) => {
    res.json(await storage.getPrescriptionsByPaymentStatus(req.params.status));
  });
  app.get("/api/prescriptions/unbilled", async (req, res) => {
    res.json(await storage.getUnbilledPrescriptions());
  });

  // ============ LAB REPORTS ============
  app.get(api.labReports.list.path, async (req, res) => res.json(await storage.getLabReports()));
  app.post(api.labReports.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createLabReport(api.labReports.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.labReports.get.path, isAuthenticated, async (req, res) => {
    const lab = await storage.getLabReport(Number(req.params.id));
    if (!lab) return res.status(404).json({ message: "Lab report not found" });
    res.json(lab);
  });
  app.put(api.labReports.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateLabReport(Number(req.params.id), api.labReports.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.patch("/api/lab-reports/:id", isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateLabReport(Number(req.params.id), req.body)); }
    catch (err) { res.status(400).json({ message: (err as Error).message }); }
  });
  app.get(api.labReports.byPatient.path, isAuthenticated, async (req, res) => res.json(await storage.getLabReportsByPatient(Number(req.params.id))));

  // ============ RATINGS ============
  app.post(api.ratings.create.path, async (req, res) => {
    try { res.status(201).json(await storage.createRating(api.ratings.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.ratings.getByDoctor.path, async (req, res) => res.json(await storage.getRatingsByDoctor(Number(req.params.id))));

  // ============ WARDS ============
  app.get(api.wards.list.path, async (req, res) => res.json(await storage.getWards()));
  app.post(api.wards.create.path, async (req, res) => {
    try { res.status(201).json(await storage.createWard(api.wards.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.wards.get.path, async (req, res) => {
    const ward = await storage.getWard(Number(req.params.id));
    if (!ward) return res.status(404).json({ message: "Ward not found" });
    res.json(ward);
  });
  app.put(api.wards.update.path, async (req, res) => {
    try { res.json(await storage.updateWard(Number(req.params.id), api.wards.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ BEDS ============
  app.get(api.beds.list.path, async (req, res) => res.json(await storage.getBeds()));
  app.post(api.beds.create.path, async (req, res) => {
    try { res.status(201).json(await storage.createBed(api.beds.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.beds.get.path, async (req, res) => {
    const bed = await storage.getBed(Number(req.params.id));
    if (!bed) return res.status(404).json({ message: "Bed not found" });
    res.json(bed);
  });
  app.put(api.beds.update.path, async (req, res) => {
    try { res.json(await storage.updateBed(Number(req.params.id), api.beds.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.beds.byWard.path, async (req, res) => res.json(await storage.getBedsByWard(Number(req.params.id))));

  // ============ WARD ASSIGNMENTS ============
  app.get(api.wardAssignments.list.path, async (req, res) => res.json(await storage.getWardAssignments()));
  app.get(api.wardAssignments.active.path, async (req, res) => res.json(await storage.getActiveWardAssignments()));
  app.post(api.wardAssignments.create.path, async (req, res) => {
    try { res.status(201).json(await storage.createWardAssignment(api.wardAssignments.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.put(api.wardAssignments.update.path, async (req, res) => {
    try { res.json(await storage.updateWardAssignment(Number(req.params.id), api.wardAssignments.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ NURSE TASKS ============
  app.get(api.nurseTasks.list.path, async (req, res) => res.json(await storage.getNurseTasks()));
  app.post(api.nurseTasks.create.path, async (req, res) => {
    try { res.status(201).json(await storage.createNurseTask(api.nurseTasks.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.put(api.nurseTasks.update.path, async (req, res) => {
    try { res.json(await storage.updateNurseTask(Number(req.params.id), api.nurseTasks.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.nurseTasks.byAssignee.path, isAuthenticated, async (req, res) => res.json(await storage.getNurseTasksByAssignee(Number(req.params.id))));
  app.get(api.nurseTasks.byPatient.path, isAuthenticated, async (req, res) => res.json(await storage.getNurseTasksByPatient(Number(req.params.id))));

  // ============ STAFF ============
  app.get(api.staff.list.path, async (req, res) => res.json(await storage.getStaff()));
  app.post(api.staff.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createStaff(api.staff.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.staff.get.path, isAuthenticated, async (req, res) => {
    const s = await storage.getStaffMember(Number(req.params.id));
    if (!s) return res.status(404).json({ message: "Staff not found" });
    res.json(s);
  });
  app.put(api.staff.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateStaff(Number(req.params.id), api.staff.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ INSURANCE PROVIDERS ============
  app.get(api.insuranceProviders.list.path, async (req, res) => res.json(await storage.getInsuranceProviders()));
  app.post(api.insuranceProviders.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createInsuranceProvider(api.insuranceProviders.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.insuranceProviders.get.path, isAuthenticated, async (req, res) => {
    const p = await storage.getInsuranceProvider(Number(req.params.id));
    if (!p) return res.status(404).json({ message: "Insurance provider not found" });
    res.json(p);
  });
  app.put(api.insuranceProviders.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateInsuranceProvider(Number(req.params.id), api.insuranceProviders.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ INSURANCE CLAIMS ============
  app.get(api.insuranceClaims.list.path, async (req, res) => res.json(await storage.getInsuranceClaims()));
  app.post(api.insuranceClaims.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createInsuranceClaim(api.insuranceClaims.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.insuranceClaims.get.path, isAuthenticated, async (req, res) => {
    const c = await storage.getInsuranceClaim(Number(req.params.id));
    if (!c) return res.status(404).json({ message: "Claim not found" });
    res.json(c);
  });
  app.put(api.insuranceClaims.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateInsuranceClaim(Number(req.params.id), api.insuranceClaims.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ PRE-AUTHORIZATIONS ============
  app.get(api.preAuthorizations.list.path, async (req, res) => res.json(await storage.getPreAuthorizations()));
  app.post(api.preAuthorizations.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createPreAuthorization(api.preAuthorizations.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.put(api.preAuthorizations.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updatePreAuthorization(Number(req.params.id), api.preAuthorizations.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ PHARMA - MEDICINE CATEGORIES ============
  app.get(api.medicineCategories.list.path, async (req, res) => res.json(await storage.getMedicineCategories()));
  app.post(api.medicineCategories.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createMedicineCategory(api.medicineCategories.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ PHARMA - MEDICINE FORMS ============
  app.get(api.medicineForms.list.path, async (req, res) => res.json(await storage.getMedicineForms()));
  app.post(api.medicineForms.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createMedicineForm(api.medicineForms.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ PHARMA - SUPPLIERS ============
  app.get(api.suppliers.list.path, async (req, res) => res.json(await storage.getSuppliers()));
  app.post(api.suppliers.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createSupplier(api.suppliers.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.suppliers.get.path, isAuthenticated, async (req, res) => {
    const s = await storage.getSupplier(Number(req.params.id));
    if (!s) return res.status(404).json({ message: "Supplier not found" });
    res.json(s);
  });
  app.put(api.suppliers.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateSupplier(Number(req.params.id), api.suppliers.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ PHARMA - MEDICINES ============
  app.get(api.medicines.list.path, async (req, res) => res.json(await storage.getMedicines()));
  app.post(api.medicines.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createMedicine(api.medicines.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.medicines.get.path, isAuthenticated, async (req, res) => {
    const m = await storage.getMedicine(Number(req.params.id));
    if (!m) return res.status(404).json({ message: "Medicine not found" });
    res.json(m);
  });
  app.put(api.medicines.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateMedicine(Number(req.params.id), api.medicines.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.medicines.lowStock.path, async (req, res) => res.json(await storage.getLowStockMedicines()));
  app.get(api.medicines.expired.path, async (req, res) => res.json(await storage.getExpiredMedicines()));

  // ============ PHARMA - PURCHASE ORDERS ============
  app.get(api.purchaseOrders.list.path, async (req, res) => res.json(await storage.getPurchaseOrders()));
  app.post(api.purchaseOrders.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createPurchaseOrder(api.purchaseOrders.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.put(api.purchaseOrders.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updatePurchaseOrder(Number(req.params.id), api.purchaseOrders.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ PHARMA - SURGICAL SUPPLIES ============
  app.get(api.surgicalSupplies.list.path, async (req, res) => res.json(await storage.getSurgicalSupplies()));
  app.post(api.surgicalSupplies.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createSurgicalSupply(api.surgicalSupplies.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.put(api.surgicalSupplies.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateSurgicalSupply(Number(req.params.id), api.surgicalSupplies.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ AMBULANCES ============
  app.get(api.ambulances.list.path, async (req, res) => res.json(await storage.getAmbulances()));
  app.post(api.ambulances.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createAmbulance(api.ambulances.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.ambulances.get.path, isAuthenticated, async (req, res) => {
    const a = await storage.getAmbulance(Number(req.params.id));
    if (!a) return res.status(404).json({ message: "Ambulance not found" });
    res.json(a);
  });
  app.put(api.ambulances.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateAmbulance(Number(req.params.id), api.ambulances.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.ambulances.available.path, async (req, res) => res.json(await storage.getAvailableAmbulances()));

  // ============ AMBULANCE BOOKINGS ============
  app.get(api.ambulanceBookings.list.path, async (req, res) => res.json(await storage.getAmbulanceBookings()));
  app.post(api.ambulanceBookings.create.path, async (req, res) => {
    try { res.status(201).json(await storage.createAmbulanceBooking(api.ambulanceBookings.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.put(api.ambulanceBookings.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateAmbulanceBooking(Number(req.params.id), api.ambulanceBookings.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ INVOICES (Cashier) ============
  app.get(api.invoices.list.path, async (req, res) => res.json(await storage.getInvoices()));
  app.post(api.invoices.create.path, isAuthenticated, async (req, res) => {
    try {
      const { labReportIds, items, ...invoiceData } = req.body;
      
      const invoicePayload = {
        ...invoiceData,
        invoiceDate: new Date(invoiceData.invoiceDate),
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
        subtotal: invoiceData.totalAmount,
      };
      
      const invoice = await storage.createInvoice(api.invoices.create.input.parse(invoicePayload));
      
      if (labReportIds && Array.isArray(labReportIds) && labReportIds.length > 0) {
        for (const labReportId of labReportIds) {
          if (typeof labReportId === 'number') {
            await storage.updateLabReport(labReportId, { 
              paymentStatus: 'paid',
              invoiceId: invoice.id 
            });
          }
        }
      }
      
      // Update prescriptions payment status
      const { prescriptionIds } = req.body;
      if (prescriptionIds && Array.isArray(prescriptionIds) && prescriptionIds.length > 0) {
        for (const prescriptionId of prescriptionIds) {
          if (typeof prescriptionId === 'number') {
            await storage.updatePrescription(prescriptionId, { 
              paymentStatus: 'paid',
              invoiceId: invoice.id 
            });
          }
        }
      }
      
      res.status(201).json(invoice);
    }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.invoices.get.path, isAuthenticated, async (req, res) => {
    const inv = await storage.getInvoice(Number(req.params.id));
    if (!inv) return res.status(404).json({ message: "Invoice not found" });
    res.json(inv);
  });
  app.put(api.invoices.update.path, isAuthenticated, async (req, res) => {
    try { res.json(await storage.updateInvoice(Number(req.params.id), api.invoices.update.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.get(api.invoices.byPatient.path, async (req, res) => res.json(await storage.getInvoicesByPatient(Number(req.params.id))));
  app.get(api.invoices.pending.path, async (req, res) => res.json(await storage.getPendingInvoices()));

  // ============ PAYMENT TRANSACTIONS ============
  app.get(api.payments.list.path, async (req, res) => res.json(await storage.getPaymentTransactions()));
  app.post(api.payments.create.path, isAuthenticated, async (req, res) => {
    try { res.status(201).json(await storage.createPaymentTransaction(api.payments.create.input.parse(req.body))); }
    catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });

  // ============ NOTIFICATIONS ============
  app.get("/api/notifications", async (req, res) => res.json(await storage.getNotifications()));
  app.get("/api/notifications/doctor/:doctorId", async (req, res) => {
    res.json(await storage.getNotificationsByDoctor(Number(req.params.doctorId)));
  });
  app.get("/api/notifications/user/:userId", async (req, res) => {
    res.json(await storage.getNotificationsByUser(Number(req.params.userId)));
  });
  app.patch("/api/notifications/:id/read", async (req, res) => {
    const notif = await storage.markNotificationRead(Number(req.params.id));
    res.json(notif);
  });
  app.post("/api/notifications/mark-all-read", async (req, res) => {
    const { doctorId, userId } = req.body;
    await storage.markAllNotificationsRead(doctorId, userId);
    res.json({ success: true });
  });

  // ============ STATS & ANALYTICS ============
  app.get(api.stats.get.path, async (req, res) => res.json(await storage.getStats()));
  app.get(api.stats.dashboard.path, async (req, res) => res.json(await storage.getDashboardStats()));
  app.get(api.stats.revenue.path, async (req, res) => {
    const startDate = new Date(req.query.start as string || new Date().setDate(1));
    const endDate = new Date(req.query.end as string || new Date());
    res.json(await storage.getRevenueStats(startDate, endDate));
  });

  // ============ ATTENDANCE ============
  app.get("/api/attendance", isAuthenticated, async (req, res) => res.json(await storage.getAttendance()));
  app.get("/api/attendance/user/:userId", isAuthenticated, async (req, res) => {
    res.json(await storage.getAttendanceByUser(Number(req.params.userId)));
  });
  app.get("/api/attendance/date/:date", isAuthenticated, async (req, res) => {
    res.json(await storage.getAttendanceByDate(req.params.date));
  });
  app.get("/api/attendance/today", isAuthenticated, async (req: any, res) => {
    const record = await storage.getTodayAttendanceForUser(req.session.userId);
    res.json(record || null);
  });
  app.post("/api/attendance/check-in", isAuthenticated, async (req: any, res) => {
    try {
      const record = await storage.checkIn(req.session.userId);
      res.status(201).json(record);
    } catch (err) {
      res.status(500).json({ message: "Check-in failed" });
    }
  });
  app.post("/api/attendance/check-out", isAuthenticated, async (req: any, res) => {
    try {
      const record = await storage.checkOut(req.session.userId);
      if (!record) {
        return res.status(400).json({ message: "No check-in found for today" });
      }
      res.json(record);
    } catch (err) {
      res.status(500).json({ message: "Check-out failed" });
    }
  });

  // ============ USER DUTY SETTINGS ============
  app.patch("/api/users/:id/duty-settings", isAuthenticated, async (req: any, res) => {
    try {
      const targetUserId = Number(req.params.id);
      const currentUser = await getUserById(req.session.userId);
      
      // Only allow users to update their own settings, or admins to update anyone's
      if (targetUserId !== req.session.userId && currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to modify other users' settings" });
      }
      
      const { dutyStartTime, dutyEndTime, assignedWardId } = z.object({
        dutyStartTime: z.string().optional(),
        dutyEndTime: z.string().optional(),
        assignedWardId: z.number().nullable().optional()
      }).parse(req.body);
      
      const user = await storage.updateUser(targetUserId, { dutyStartTime, dutyEndTime, assignedWardId });
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to update duty settings" });
    }
  });

  // ============ PATIENT PORTAL ENDPOINTS ============
  // Helper to get patient ID for logged-in patient user
  const getPatientIdForUser = async (userId: number): Promise<number | null> => {
    const user = await getUserById(userId);
    return user?.patientId || null;
  };

  // Patient's appointments
  app.get("/api/patient/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const patientId = await getPatientIdForUser(req.session.userId);
      if (!patientId) return res.status(403).json({ message: "No patient profile linked" });
      const appointments = await storage.getAppointmentsByPatient(patientId);
      res.json(appointments);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/patient/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const patientId = await getPatientIdForUser(req.session.userId);
      if (!patientId) return res.status(403).json({ message: "No patient profile linked" });
      
      const { doctorId, date, reason } = z.object({
        doctorId: z.number(),
        date: z.string(),
        reason: z.string().optional()
      }).parse(req.body);
      
      const doctor = await storage.getDoctor(doctorId);
      const appointment = await storage.createAppointment({
        patientId,
        doctorId,
        departmentId: doctor?.departmentId || null,
        date: new Date(date),
        timeSlot: "09:00-10:00",
        type: "consultation",
        status: "scheduled",
        priority: "normal",
        notes: reason || null,
        symptoms: null,
        chiefComplaint: reason || null,
        vitalsTaken: false,
        followUpDate: null,
        meetingLink: null
      });
      res.status(201).json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to book appointment" });
    }
  });

  app.delete("/api/patient/appointments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const patientId = await getPatientIdForUser(req.session.userId);
      if (!patientId) return res.status(403).json({ message: "No patient profile linked" });
      
      const appointmentId = Number(req.params.id);
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment || appointment.patientId !== patientId) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      await storage.updateAppointment(appointmentId, { status: "cancelled" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to cancel appointment" });
    }
  });

  // Patient's prescriptions
  app.get("/api/patient/prescriptions", isAuthenticated, async (req: any, res) => {
    try {
      const patientId = await getPatientIdForUser(req.session.userId);
      if (!patientId) return res.status(403).json({ message: "No patient profile linked" });
      const prescriptions = await storage.getPrescriptionsByPatient(patientId);
      res.json(prescriptions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  // Patient's lab reports
  app.get("/api/patient/lab-reports", isAuthenticated, async (req: any, res) => {
    try {
      const patientId = await getPatientIdForUser(req.session.userId);
      if (!patientId) return res.status(403).json({ message: "No patient profile linked" });
      const labReports = await storage.getLabReportsByPatient(patientId);
      res.json(labReports);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch lab reports" });
    }
  });

  // Patient's bills (invoices)
  app.get("/api/patient/bills", isAuthenticated, async (req: any, res) => {
    try {
      const patientId = await getPatientIdForUser(req.session.userId);
      if (!patientId) return res.status(403).json({ message: "No patient profile linked" });
      const invoices = await storage.getInvoicesByPatient(patientId);
      res.json(invoices);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch bills" });
    }
  });

  // Patient's profile
  app.get("/api/patient/profile", isAuthenticated, async (req: any, res) => {
    try {
      const patientId = await getPatientIdForUser(req.session.userId);
      if (!patientId) return res.status(403).json({ message: "No patient profile linked" });
      const patient = await storage.getPatient(patientId);
      res.json(patient);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch("/api/patient/profile", isAuthenticated, async (req: any, res) => {
    try {
      const patientId = await getPatientIdForUser(req.session.userId);
      if (!patientId) return res.status(403).json({ message: "No patient profile linked" });
      
      const allowedFields = z.object({
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        emergencyContact: z.string().optional(),
        emergencyContactName: z.string().optional()
      }).parse(req.body);
      
      const patient = await storage.updatePatient(patientId, allowedFields);
      res.json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  return httpServer;
}
