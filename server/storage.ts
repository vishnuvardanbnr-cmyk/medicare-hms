import { 
  doctors, patients, appointments, departments, prescriptions, labReports, doctorRatings, 
  wards, wardAssignments, staff, invoices, users, opTokens, patientVitals, nurseTasks, beds,
  insuranceProviders, insuranceClaims, preAuthorizations, medicineCategories, medicineForms,
  suppliers, medicines, purchaseOrders, surgicalSupplies, ambulances, ambulanceBookings, paymentTransactions,
  notifications, attendance,
  type Doctor, type InsertDoctor, type Patient, type InsertPatient, type Appointment, type InsertAppointment,
  type Department, type InsertDepartment, type Prescription, type InsertPrescription, type LabReport, type InsertLabReport,
  type DoctorRating, type InsertDoctorRating, type Ward, type InsertWard, type WardAssignment, type InsertWardAssignment,
  type Staff, type InsertStaff, type Invoice, type InsertInvoice, type User, type InsertUser,
  type OpToken, type InsertOpToken, type PatientVitals, type InsertPatientVitals, type NurseTask, type InsertNurseTask,
  type Bed, type InsertBed, type InsuranceProvider, type InsertInsuranceProvider, type InsuranceClaim, type InsertInsuranceClaim,
  type PreAuthorization, type InsertPreAuthorization, type MedicineCategory, type InsertMedicineCategory,
  type MedicineForm, type InsertMedicineForm, type Supplier, type InsertSupplier, type Medicine, type InsertMedicine,
  type PurchaseOrder, type InsertPurchaseOrder, type SurgicalSupply, type InsertSurgicalSupply,
  type Ambulance, type InsertAmbulance, type AmbulanceBooking, type InsertAmbulanceBooking,
  type PaymentTransaction, type InsertPaymentTransaction,
  type Notification, type InsertNotification,
  type Attendance, type InsertAttendance
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Doctors
  getDoctors(): Promise<Doctor[]>;
  getDoctor(id: number): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: number, doctor: Partial<InsertDoctor>): Promise<Doctor>;
  getDoctorsByDepartment(departmentId: number): Promise<Doctor[]>;

  // Patients
  getPatients(): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByUid(uid: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;
  searchPatients(query: string): Promise<Patient[]>;

  // OP Tokens
  getOpTokens(): Promise<OpToken[]>;
  getOpToken(id: number): Promise<OpToken | undefined>;
  createOpToken(token: InsertOpToken): Promise<OpToken>;
  updateOpToken(id: number, token: Partial<InsertOpToken>): Promise<OpToken>;
  getOpTokensByDoctor(doctorId: number, date?: string): Promise<OpToken[]>;
  getOpTokensByPatient(patientId: number): Promise<OpToken[]>;

  // Appointments
  getAppointments(): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  getAppointmentsByDoctor(doctorId: number, date?: string): Promise<Appointment[]>;
  getAppointmentsByPatient(patientId: number): Promise<Appointment[]>;

  // Vitals
  getPatientVitals(patientId: number): Promise<PatientVitals[]>;
  createPatientVitals(vitals: InsertPatientVitals): Promise<PatientVitals>;
  getLatestVitals(patientId: number): Promise<PatientVitals | undefined>;

  // Prescriptions
  getPrescriptions(): Promise<Prescription[]>;
  getPrescription(id: number): Promise<Prescription | undefined>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: number, prescription: Partial<InsertPrescription>): Promise<Prescription>;
  getPrescriptionsByPatient(patientId: number): Promise<Prescription[]>;
  getPrescriptionsByPaymentStatus(status: string): Promise<Prescription[]>;
  getUnbilledPrescriptions(): Promise<Prescription[]>;

  // Lab Reports
  getLabReports(): Promise<LabReport[]>;
  getLabReport(id: number): Promise<LabReport | undefined>;
  createLabReport(report: InsertLabReport): Promise<LabReport>;
  updateLabReport(id: number, report: Partial<InsertLabReport>): Promise<LabReport>;
  getLabReportsByPatient(patientId: number): Promise<LabReport[]>;

  // Ratings
  createRating(rating: InsertDoctorRating): Promise<DoctorRating>;
  getRatingsByDoctor(doctorId: number): Promise<DoctorRating[]>;

  // Wards & Beds
  getWards(): Promise<Ward[]>;
  getWard(id: number): Promise<Ward | undefined>;
  createWard(ward: InsertWard): Promise<Ward>;
  updateWard(id: number, ward: Partial<InsertWard>): Promise<Ward>;
  getBeds(): Promise<Bed[]>;
  getBedsByWard(wardId: number): Promise<Bed[]>;
  getBed(id: number): Promise<Bed | undefined>;
  createBed(bed: InsertBed): Promise<Bed>;
  updateBed(id: number, bed: Partial<InsertBed>): Promise<Bed>;

  // Ward Assignments
  getWardAssignments(): Promise<WardAssignment[]>;
  getActiveWardAssignments(): Promise<WardAssignment[]>;
  createWardAssignment(assignment: InsertWardAssignment): Promise<WardAssignment>;
  updateWardAssignment(id: number, assignment: Partial<InsertWardAssignment>): Promise<WardAssignment>;

  // Nurse Tasks
  getNurseTasks(): Promise<NurseTask[]>;
  getNurseTasksByAssignee(userId: number): Promise<NurseTask[]>;
  getNurseTasksByPatient(patientId: number): Promise<NurseTask[]>;
  createNurseTask(task: InsertNurseTask): Promise<NurseTask>;
  updateNurseTask(id: number, task: Partial<InsertNurseTask>): Promise<NurseTask>;

  // Staff
  getStaff(): Promise<Staff[]>;
  getStaffMember(id: number): Promise<Staff | undefined>;
  createStaff(staffMember: InsertStaff): Promise<Staff>;
  updateStaff(id: number, staffMember: Partial<InsertStaff>): Promise<Staff>;

  // Insurance
  getInsuranceProviders(): Promise<InsuranceProvider[]>;
  getInsuranceProvider(id: number): Promise<InsuranceProvider | undefined>;
  createInsuranceProvider(provider: InsertInsuranceProvider): Promise<InsuranceProvider>;
  updateInsuranceProvider(id: number, provider: Partial<InsertInsuranceProvider>): Promise<InsuranceProvider>;
  getInsuranceClaims(): Promise<InsuranceClaim[]>;
  getInsuranceClaim(id: number): Promise<InsuranceClaim | undefined>;
  createInsuranceClaim(claim: InsertInsuranceClaim): Promise<InsuranceClaim>;
  updateInsuranceClaim(id: number, claim: Partial<InsertInsuranceClaim>): Promise<InsuranceClaim>;
  getPreAuthorizations(): Promise<PreAuthorization[]>;
  createPreAuthorization(auth: InsertPreAuthorization): Promise<PreAuthorization>;
  updatePreAuthorization(id: number, auth: Partial<InsertPreAuthorization>): Promise<PreAuthorization>;

  // Pharma
  getMedicineCategories(): Promise<MedicineCategory[]>;
  createMedicineCategory(category: InsertMedicineCategory): Promise<MedicineCategory>;
  getMedicineForms(): Promise<MedicineForm[]>;
  createMedicineForm(form: InsertMedicineForm): Promise<MedicineForm>;
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  getMedicines(): Promise<Medicine[]>;
  getMedicine(id: number): Promise<Medicine | undefined>;
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  updateMedicine(id: number, medicine: Partial<InsertMedicine>): Promise<Medicine>;
  getLowStockMedicines(): Promise<Medicine[]>;
  getExpiredMedicines(): Promise<Medicine[]>;
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, order: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder>;
  getSurgicalSupplies(): Promise<SurgicalSupply[]>;
  createSurgicalSupply(supply: InsertSurgicalSupply): Promise<SurgicalSupply>;
  updateSurgicalSupply(id: number, supply: Partial<InsertSurgicalSupply>): Promise<SurgicalSupply>;

  // Ambulance
  getAmbulances(): Promise<Ambulance[]>;
  getAmbulance(id: number): Promise<Ambulance | undefined>;
  createAmbulance(ambulance: InsertAmbulance): Promise<Ambulance>;
  updateAmbulance(id: number, ambulance: Partial<InsertAmbulance>): Promise<Ambulance>;
  getAvailableAmbulances(): Promise<Ambulance[]>;
  getAmbulanceBookings(): Promise<AmbulanceBooking[]>;
  createAmbulanceBooking(booking: InsertAmbulanceBooking): Promise<AmbulanceBooking>;
  updateAmbulanceBooking(id: number, booking: Partial<InsertAmbulanceBooking>): Promise<AmbulanceBooking>;

  // Invoices & Payments
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  getInvoicesByPatient(patientId: number): Promise<Invoice[]>;
  getPendingInvoices(): Promise<Invoice[]>;
  getPaymentTransactions(): Promise<PaymentTransaction[]>;
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;

  // Departments
  getDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department>;

  // Stats & Analytics
  getStats(): Promise<any>;
  getDashboardStats(): Promise<any>;
  getRevenueStats(startDate: Date, endDate: Date): Promise<any>;

  // Notifications
  getNotifications(): Promise<Notification[]>;
  getNotificationsByDoctor(doctorId: number): Promise<Notification[]>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<Notification>;
  markAllNotificationsRead(doctorId?: number, userId?: number): Promise<void>;

  // Attendance
  getAttendance(): Promise<Attendance[]>;
  getAttendanceByUser(userId: number): Promise<Attendance[]>;
  getAttendanceByDate(date: string): Promise<Attendance[]>;
  getTodayAttendanceForUser(userId: number): Promise<Attendance | undefined>;
  createAttendance(record: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, record: Partial<InsertAttendance>): Promise<Attendance>;
  checkIn(userId: number): Promise<Attendance>;
  checkOut(userId: number): Promise<Attendance | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUsers() { return db.select().from(users); }
  async getUser(id: number) { const [user] = await db.select().from(users).where(eq(users.id, id)); return user; }
  async getUserByEmail(email: string) { const [user] = await db.select().from(users).where(eq(users.email, email)); return user; }
  async createUser(insertUser: InsertUser) { const [user] = await db.insert(users).values(insertUser).returning(); return user; }
  async updateUser(id: number, updateData: Partial<InsertUser>) { const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning(); return user; }

  // Doctors
  async getDoctors() { return db.select().from(doctors); }
  async getDoctor(id: number) { const [doc] = await db.select().from(doctors).where(eq(doctors.id, id)); return doc; }
  async createDoctor(insertDoctor: InsertDoctor) { const [doc] = await db.insert(doctors).values(insertDoctor).returning(); return doc; }
  async updateDoctor(id: number, updateData: Partial<InsertDoctor>) { const [doc] = await db.update(doctors).set(updateData).where(eq(doctors.id, id)).returning(); return doc; }
  async getDoctorsByDepartment(departmentId: number) { return db.select().from(doctors).where(eq(doctors.departmentId, departmentId)); }

  // Patients
  async getPatients() { return db.select().from(patients); }
  async getPatient(id: number) { const [pat] = await db.select().from(patients).where(eq(patients.id, id)); return pat; }
  async getPatientByUid(uid: string) { const [pat] = await db.select().from(patients).where(eq(patients.patientUid, uid)); return pat; }
  async createPatient(insertPatient: InsertPatient) { const [pat] = await db.insert(patients).values(insertPatient).returning(); return pat; }
  async updatePatient(id: number, updateData: Partial<InsertPatient>) { const [pat] = await db.update(patients).set(updateData).where(eq(patients.id, id)).returning(); return pat; }
  async searchPatients(query: string) { return db.select().from(patients).where(sql`${patients.name} ILIKE ${'%' + query + '%'} OR ${patients.phone} ILIKE ${'%' + query + '%'} OR ${patients.patientUid} ILIKE ${'%' + query + '%'}`); }

  // OP Tokens
  async getOpTokens() { return db.select().from(opTokens).orderBy(desc(opTokens.createdAt)); }
  async getOpToken(id: number) { const [token] = await db.select().from(opTokens).where(eq(opTokens.id, id)); return token; }
  async createOpToken(insertToken: InsertOpToken) { const [token] = await db.insert(opTokens).values(insertToken).returning(); return token; }
  async updateOpToken(id: number, updateData: Partial<InsertOpToken>) { const [token] = await db.update(opTokens).set(updateData).where(eq(opTokens.id, id)).returning(); return token; }
  async getOpTokensByDoctor(doctorId: number, date?: string) { 
    if (date) {
      return db.select().from(opTokens).where(and(eq(opTokens.doctorId, doctorId), eq(opTokens.tokenDate, date))).orderBy(opTokens.queuePosition);
    }
    return db.select().from(opTokens).where(eq(opTokens.doctorId, doctorId)).orderBy(desc(opTokens.createdAt)); 
  }
  async getOpTokensByPatient(patientId: number) { return db.select().from(opTokens).where(eq(opTokens.patientId, patientId)).orderBy(desc(opTokens.createdAt)); }

  // Appointments
  async getAppointments() { return db.select().from(appointments).orderBy(desc(appointments.date)); }
  async getAppointment(id: number) { const [apt] = await db.select().from(appointments).where(eq(appointments.id, id)); return apt; }
  async createAppointment(insertAppointment: InsertAppointment) { const [apt] = await db.insert(appointments).values(insertAppointment).returning(); return apt; }
  async updateAppointment(id: number, updateData: Partial<InsertAppointment>) { const [apt] = await db.update(appointments).set(updateData).where(eq(appointments.id, id)).returning(); return apt; }
  async getAppointmentsByDoctor(doctorId: number, date?: string) { 
    if (date) {
      return db.select().from(appointments).where(and(eq(appointments.doctorId, doctorId), sql`date(${appointments.date}) = ${date}`)).orderBy(appointments.date);
    }
    return db.select().from(appointments).where(eq(appointments.doctorId, doctorId)).orderBy(desc(appointments.date)); 
  }
  async getAppointmentsByPatient(patientId: number) { return db.select().from(appointments).where(eq(appointments.patientId, patientId)).orderBy(desc(appointments.date)); }

  // Vitals
  async getPatientVitals(patientId: number) { return db.select().from(patientVitals).where(eq(patientVitals.patientId, patientId)).orderBy(desc(patientVitals.recordedAt)); }
  async createPatientVitals(insertVitals: InsertPatientVitals) { const [v] = await db.insert(patientVitals).values(insertVitals).returning(); return v; }
  async getLatestVitals(patientId: number) { const [v] = await db.select().from(patientVitals).where(eq(patientVitals.patientId, patientId)).orderBy(desc(patientVitals.recordedAt)).limit(1); return v; }

  // Prescriptions
  async getPrescriptions() { return db.select().from(prescriptions).orderBy(desc(prescriptions.createdAt)); }
  async getPrescription(id: number) { const [prx] = await db.select().from(prescriptions).where(eq(prescriptions.id, id)); return prx; }
  async createPrescription(insertPrescription: InsertPrescription) { const [prx] = await db.insert(prescriptions).values(insertPrescription).returning(); return prx; }
  async updatePrescription(id: number, updateData: Partial<InsertPrescription>) { const [prx] = await db.update(prescriptions).set(updateData).where(eq(prescriptions.id, id)).returning(); return prx; }
  async getPrescriptionsByPatient(patientId: number) { return db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId)).orderBy(desc(prescriptions.createdAt)); }
  async getPrescriptionsByPaymentStatus(status: string) { return db.select().from(prescriptions).where(eq(prescriptions.paymentStatus, status)).orderBy(desc(prescriptions.createdAt)); }
  async getUnbilledPrescriptions() { return db.select().from(prescriptions).where(eq(prescriptions.paymentStatus, "unbilled")).orderBy(desc(prescriptions.createdAt)); }

  // Lab Reports
  async getLabReports() { return db.select().from(labReports).orderBy(desc(labReports.createdAt)); }
  async getLabReport(id: number) { const [lab] = await db.select().from(labReports).where(eq(labReports.id, id)); return lab; }
  async createLabReport(insertLabReport: InsertLabReport) { const [lab] = await db.insert(labReports).values(insertLabReport).returning(); return lab; }
  async updateLabReport(id: number, updateData: Partial<InsertLabReport>) { const [lab] = await db.update(labReports).set(updateData).where(eq(labReports.id, id)).returning(); return lab; }
  async getLabReportsByPatient(patientId: number) { return db.select().from(labReports).where(eq(labReports.patientId, patientId)).orderBy(desc(labReports.createdAt)); }

  // Ratings
  async createRating(insertRating: InsertDoctorRating) { const [rating] = await db.insert(doctorRatings).values(insertRating).returning(); return rating; }
  async getRatingsByDoctor(doctorId: number) { return db.select().from(doctorRatings).where(eq(doctorRatings.doctorId, doctorId)); }

  // Wards
  async getWards() { return db.select().from(wards); }
  async getWard(id: number) { const [w] = await db.select().from(wards).where(eq(wards.id, id)); return w; }
  async createWard(insertWard: InsertWard) { const [w] = await db.insert(wards).values(insertWard).returning(); return w; }
  async updateWard(id: number, updateData: Partial<InsertWard>) { const [w] = await db.update(wards).set(updateData).where(eq(wards.id, id)).returning(); return w; }

  // Beds
  async getBeds() { return db.select().from(beds); }
  async getBedsByWard(wardId: number) { return db.select().from(beds).where(eq(beds.wardId, wardId)); }
  async getBed(id: number) { const [b] = await db.select().from(beds).where(eq(beds.id, id)); return b; }
  async createBed(insertBed: InsertBed) { const [b] = await db.insert(beds).values(insertBed).returning(); return b; }
  async updateBed(id: number, updateData: Partial<InsertBed>) { const [b] = await db.update(beds).set(updateData).where(eq(beds.id, id)).returning(); return b; }

  // Ward Assignments
  async getWardAssignments() { return db.select().from(wardAssignments).orderBy(desc(wardAssignments.admissionDate)); }
  async getActiveWardAssignments() { return db.select().from(wardAssignments).where(eq(wardAssignments.status, 'active')); }
  async createWardAssignment(insertAssignment: InsertWardAssignment) { const [wa] = await db.insert(wardAssignments).values(insertAssignment).returning(); return wa; }
  async updateWardAssignment(id: number, updateData: Partial<InsertWardAssignment>) { const [wa] = await db.update(wardAssignments).set(updateData).where(eq(wardAssignments.id, id)).returning(); return wa; }

  // Nurse Tasks
  async getNurseTasks() { return db.select().from(nurseTasks).orderBy(desc(nurseTasks.createdAt)); }
  async getNurseTasksByAssignee(userId: number) { return db.select().from(nurseTasks).where(eq(nurseTasks.assignedTo, userId)).orderBy(nurseTasks.scheduledTime); }
  async getNurseTasksByPatient(patientId: number) { return db.select().from(nurseTasks).where(eq(nurseTasks.patientId, patientId)); }
  async createNurseTask(insertTask: InsertNurseTask) { const [t] = await db.insert(nurseTasks).values(insertTask).returning(); return t; }
  async updateNurseTask(id: number, updateData: Partial<InsertNurseTask>) { const [t] = await db.update(nurseTasks).set(updateData).where(eq(nurseTasks.id, id)).returning(); return t; }

  // Staff
  async getStaff() { return db.select().from(staff); }
  async getStaffMember(id: number) { const [s] = await db.select().from(staff).where(eq(staff.id, id)); return s; }
  async createStaff(insertStaff: InsertStaff) { const [s] = await db.insert(staff).values(insertStaff).returning(); return s; }
  async updateStaff(id: number, updateData: Partial<InsertStaff>) { const [s] = await db.update(staff).set(updateData).where(eq(staff.id, id)).returning(); return s; }

  // Insurance Providers
  async getInsuranceProviders() { return db.select().from(insuranceProviders); }
  async getInsuranceProvider(id: number) { const [p] = await db.select().from(insuranceProviders).where(eq(insuranceProviders.id, id)); return p; }
  async createInsuranceProvider(insertProvider: InsertInsuranceProvider) { const [p] = await db.insert(insuranceProviders).values(insertProvider).returning(); return p; }
  async updateInsuranceProvider(id: number, updateData: Partial<InsertInsuranceProvider>) { const [p] = await db.update(insuranceProviders).set(updateData).where(eq(insuranceProviders.id, id)).returning(); return p; }

  // Insurance Claims
  async getInsuranceClaims() { return db.select().from(insuranceClaims).orderBy(desc(insuranceClaims.createdAt)); }
  async getInsuranceClaim(id: number) { const [c] = await db.select().from(insuranceClaims).where(eq(insuranceClaims.id, id)); return c; }
  async createInsuranceClaim(insertClaim: InsertInsuranceClaim) { const [c] = await db.insert(insuranceClaims).values(insertClaim).returning(); return c; }
  async updateInsuranceClaim(id: number, updateData: Partial<InsertInsuranceClaim>) { const [c] = await db.update(insuranceClaims).set(updateData).where(eq(insuranceClaims.id, id)).returning(); return c; }

  // Pre-Authorizations
  async getPreAuthorizations() { return db.select().from(preAuthorizations).orderBy(desc(preAuthorizations.createdAt)); }
  async createPreAuthorization(insertAuth: InsertPreAuthorization) { const [a] = await db.insert(preAuthorizations).values(insertAuth).returning(); return a; }
  async updatePreAuthorization(id: number, updateData: Partial<InsertPreAuthorization>) { const [a] = await db.update(preAuthorizations).set(updateData).where(eq(preAuthorizations.id, id)).returning(); return a; }

  // Medicine Categories
  async getMedicineCategories() { return db.select().from(medicineCategories); }
  async createMedicineCategory(insertCategory: InsertMedicineCategory) { const [c] = await db.insert(medicineCategories).values(insertCategory).returning(); return c; }

  // Medicine Forms
  async getMedicineForms() { return db.select().from(medicineForms); }
  async createMedicineForm(insertForm: InsertMedicineForm) { const [f] = await db.insert(medicineForms).values(insertForm).returning(); return f; }

  // Suppliers
  async getSuppliers() { return db.select().from(suppliers); }
  async getSupplier(id: number) { const [s] = await db.select().from(suppliers).where(eq(suppliers.id, id)); return s; }
  async createSupplier(insertSupplier: InsertSupplier) { const [s] = await db.insert(suppliers).values(insertSupplier).returning(); return s; }
  async updateSupplier(id: number, updateData: Partial<InsertSupplier>) { const [s] = await db.update(suppliers).set(updateData).where(eq(suppliers.id, id)).returning(); return s; }

  // Medicines
  async getMedicines() { return db.select().from(medicines); }
  async getMedicine(id: number) { const [m] = await db.select().from(medicines).where(eq(medicines.id, id)); return m; }
  async createMedicine(insertMedicine: InsertMedicine) { const [m] = await db.insert(medicines).values(insertMedicine).returning(); return m; }
  async updateMedicine(id: number, updateData: Partial<InsertMedicine>) { const [m] = await db.update(medicines).set(updateData).where(eq(medicines.id, id)).returning(); return m; }
  async getLowStockMedicines() { return db.select().from(medicines).where(sql`${medicines.quantity} <= ${medicines.reorderLevel}`); }
  async getExpiredMedicines() { const today = new Date().toISOString().split('T')[0]; return db.select().from(medicines).where(sql`${medicines.expiryDate} < ${today}`); }

  // Purchase Orders
  async getPurchaseOrders() { return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt)); }
  async createPurchaseOrder(insertOrder: InsertPurchaseOrder) { const [o] = await db.insert(purchaseOrders).values(insertOrder).returning(); return o; }
  async updatePurchaseOrder(id: number, updateData: Partial<InsertPurchaseOrder>) { const [o] = await db.update(purchaseOrders).set(updateData).where(eq(purchaseOrders.id, id)).returning(); return o; }

  // Surgical Supplies
  async getSurgicalSupplies() { return db.select().from(surgicalSupplies); }
  async createSurgicalSupply(insertSupply: InsertSurgicalSupply) { const [s] = await db.insert(surgicalSupplies).values(insertSupply).returning(); return s; }
  async updateSurgicalSupply(id: number, updateData: Partial<InsertSurgicalSupply>) { const [s] = await db.update(surgicalSupplies).set(updateData).where(eq(surgicalSupplies.id, id)).returning(); return s; }

  // Ambulances
  async getAmbulances() { return db.select().from(ambulances); }
  async getAmbulance(id: number) { const [a] = await db.select().from(ambulances).where(eq(ambulances.id, id)); return a; }
  async createAmbulance(insertAmbulance: InsertAmbulance) { const [a] = await db.insert(ambulances).values(insertAmbulance).returning(); return a; }
  async updateAmbulance(id: number, updateData: Partial<InsertAmbulance>) { const [a] = await db.update(ambulances).set(updateData).where(eq(ambulances.id, id)).returning(); return a; }
  async getAvailableAmbulances() { return db.select().from(ambulances).where(eq(ambulances.status, 'available')); }

  // Ambulance Bookings
  async getAmbulanceBookings() { return db.select().from(ambulanceBookings).orderBy(desc(ambulanceBookings.createdAt)); }
  async createAmbulanceBooking(insertBooking: InsertAmbulanceBooking) { const [b] = await db.insert(ambulanceBookings).values(insertBooking).returning(); return b; }
  async updateAmbulanceBooking(id: number, updateData: Partial<InsertAmbulanceBooking>) { const [b] = await db.update(ambulanceBookings).set(updateData).where(eq(ambulanceBookings.id, id)).returning(); return b; }

  // Invoices
  async getInvoices() { return db.select().from(invoices).orderBy(desc(invoices.createdAt)); }
  async getInvoice(id: number) { const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)); return inv; }
  async createInvoice(insertInvoice: InsertInvoice) { const [inv] = await db.insert(invoices).values(insertInvoice).returning(); return inv; }
  async updateInvoice(id: number, updateData: Partial<InsertInvoice>) { const [inv] = await db.update(invoices).set(updateData).where(eq(invoices.id, id)).returning(); return inv; }
  async getInvoicesByPatient(patientId: number) { return db.select().from(invoices).where(eq(invoices.patientId, patientId)).orderBy(desc(invoices.createdAt)); }
  async getPendingInvoices() { return db.select().from(invoices).where(eq(invoices.status, 'pending')); }

  // Payment Transactions
  async getPaymentTransactions() { return db.select().from(paymentTransactions).orderBy(desc(paymentTransactions.createdAt)); }
  async createPaymentTransaction(insertTransaction: InsertPaymentTransaction) { const [t] = await db.insert(paymentTransactions).values(insertTransaction).returning(); return t; }

  // Departments
  async getDepartments() { return db.select().from(departments); }
  async getDepartment(id: number) { const [dept] = await db.select().from(departments).where(eq(departments.id, id)); return dept; }
  async createDepartment(insertDepartment: InsertDepartment) { const [dept] = await db.insert(departments).values(insertDepartment).returning(); return dept; }
  async updateDepartment(id: number, updateData: Partial<InsertDepartment>) { const [dept] = await db.update(departments).set(updateData).where(eq(departments.id, id)).returning(); return dept; }

  // Stats
  async getStats() {
    const [patCount] = await db.select({ count: sql<number>`count(*)` }).from(patients);
    const [docCount] = await db.select({ count: sql<number>`count(*)` }).from(doctors);
    const today = new Date().toISOString().split('T')[0];
    const [apptCount] = await db.select({ count: sql<number>`count(*)` }).from(appointments).where(sql`date(${appointments.date}) = ${today}`);
    const [bedCount] = await db.select({ count: sql<number>`count(*)` }).from(beds).where(eq(beds.status, 'occupied'));
    return { 
      totalPatients: Number(patCount?.count || 0), 
      activeDoctors: Number(docCount?.count || 0), 
      appointmentsToday: Number(apptCount?.count || 0),
      occupiedBeds: Number(bedCount?.count || 0)
    };
  }

  async getDashboardStats() {
    const stats = await this.getStats();
    const [pendingInvoices] = await db.select({ count: sql<number>`count(*)`, total: sql<number>`COALESCE(sum(total_amount), 0)` }).from(invoices).where(eq(invoices.status, 'pending'));
    const [pendingTasks] = await db.select({ count: sql<number>`count(*)` }).from(nurseTasks).where(eq(nurseTasks.status, 'pending'));
    const [activeAdmissions] = await db.select({ count: sql<number>`count(*)` }).from(wardAssignments).where(eq(wardAssignments.status, 'active'));
    const [lowStockCount] = await db.select({ count: sql<number>`count(*)` }).from(medicines).where(sql`${medicines.quantity} <= ${medicines.reorderLevel}`);
    
    return {
      ...stats,
      pendingInvoicesCount: Number(pendingInvoices?.count || 0),
      pendingInvoicesAmount: Number(pendingInvoices?.total || 0),
      pendingNurseTasks: Number(pendingTasks?.count || 0),
      activeAdmissions: Number(activeAdmissions?.count || 0),
      lowStockMedicines: Number(lowStockCount?.count || 0)
    };
  }

  async getRevenueStats(startDate: Date, endDate: Date) {
    const [revenue] = await db.select({ 
      total: sql<number>`COALESCE(sum(total_amount), 0)`,
      paid: sql<number>`COALESCE(sum(paid_amount), 0)`,
      pending: sql<number>`COALESCE(sum(balance_amount), 0)`
    }).from(invoices).where(and(
      gte(invoices.invoiceDate, startDate),
      lte(invoices.invoiceDate, endDate)
    ));
    return revenue;
  }

  // Notifications
  async getNotifications() {
    return db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async getNotificationsByDoctor(doctorId: number) {
    return db.select().from(notifications)
      .where(eq(notifications.recipientDoctorId, doctorId))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotificationsByUser(userId: number) {
    return db.select().from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification) {
    const [notif] = await db.insert(notifications).values(notification).returning();
    return notif;
  }

  async markNotificationRead(id: number) {
    const [notif] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return notif;
  }

  async markAllNotificationsRead(doctorId?: number, userId?: number) {
    if (doctorId) {
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.recipientDoctorId, doctorId));
    } else if (userId) {
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.recipientId, userId));
    }
  }

  // Attendance
  async getAttendance() {
    return db.select().from(attendance).orderBy(desc(attendance.date));
  }

  async getAttendanceByUser(userId: number) {
    return db.select().from(attendance)
      .where(eq(attendance.userId, userId))
      .orderBy(desc(attendance.date));
  }

  async getAttendanceByDate(date: string) {
    return db.select().from(attendance)
      .where(eq(attendance.date, date))
      .orderBy(desc(attendance.createdAt));
  }

  async getTodayAttendanceForUser(userId: number) {
    const today = new Date().toISOString().split('T')[0];
    const [record] = await db.select().from(attendance)
      .where(and(eq(attendance.userId, userId), eq(attendance.date, today)));
    return record;
  }

  async createAttendance(record: InsertAttendance) {
    const [att] = await db.insert(attendance).values(record).returning();
    return att;
  }

  async updateAttendance(id: number, record: Partial<InsertAttendance>) {
    const [att] = await db.update(attendance).set(record).where(eq(attendance.id, id)).returning();
    return att;
  }

  async checkIn(userId: number) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Check if already checked in today
    const existing = await this.getTodayAttendanceForUser(userId);
    if (existing) {
      return existing;
    }

    // Get user's duty start time to determine if late
    const user = await this.getUser(userId);
    let status = 'present';
    if (user?.dutyStartTime) {
      const [startHour, startMin] = user.dutyStartTime.split(':').map(Number);
      const dutyStart = new Date();
      dutyStart.setHours(startHour, startMin, 0, 0);
      if (now > dutyStart) {
        status = 'late';
      }
    }

    const [att] = await db.insert(attendance).values({
      userId,
      date: today,
      checkInTime: now,
      status
    }).returning();
    return att;
  }

  async checkOut(userId: number) {
    const existing = await this.getTodayAttendanceForUser(userId);
    if (!existing || existing.checkOutTime) {
      return existing;
    }

    const now = new Date();
    const checkIn = existing.checkInTime ? new Date(existing.checkInTime) : now;
    const hoursWorked = ((now.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2);

    const [att] = await db.update(attendance)
      .set({ checkOutTime: now, hoursWorked })
      .where(eq(attendance.id, existing.id))
      .returning();
    return att;
  }
}

export const storage = new DatabaseStorage();
