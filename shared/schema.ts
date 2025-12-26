import { pgTable, text, serial, timestamp, boolean, date, integer, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users (Staff/Admins/Doctors/Nurses/Receptionists)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"), // admin, doctor, nurse, receptionist, cashier, pharmacist, staff, patient
  departmentId: integer("department_id"),
  phone: text("phone"),
  assignedWardId: integer("assigned_ward_id"),
  dutyStartTime: text("duty_start_time"), // Format: "HH:MM" e.g., "09:00"
  dutyEndTime: text("duty_end_time"), // Format: "HH:MM" e.g., "17:00"
  patientId: integer("patient_id"), // For patient role: links to patients table
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

// Staff Attendance
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  status: text("status").default("absent"), // present, absent, late, half-day, on-leave
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true });

// Departments (Multi-specialty)
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  headDoctorId: integer("head_doctor_id"),
  floor: text("floor"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });

// Doctors
export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  experience: integer("experience").notNull(),
  qualification: text("qualification"),
  licenseNumber: text("license_number"),
  daysAvailable: text("days_available").array(),
  timeSlots: text("time_slots"),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  maxPatientsPerDay: integer("max_patients_per_day").default(30),
  isAvailableForTelemedicine: boolean("is_available_for_telemedicine").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true, createdAt: true });

// Patients
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  patientUid: text("patient_uid").notNull().unique(), // Unique Patient ID
  name: text("name").notNull(),
  dob: date("dob").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  bloodGroup: text("blood_group"),
  emergencyContact: text("emergency_contact"),
  emergencyContactName: text("emergency_contact_name"),
  occupation: text("occupation"),
  maritalStatus: text("marital_status"),
  medicalHistory: text("medical_history"),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
  currentMedications: text("current_medications"),
  insuranceProviderId: integer("insurance_provider_id"),
  insurancePolicyNumber: text("insurance_policy_number"),
  primaryDoctorId: integer("primary_doctor_id").references(() => doctors.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true }).extend({
  patientUid: z.string().optional(),
});

// OP Tokens (Outpatient Registration Tokens)
export const opTokens = pgTable("op_tokens", {
  id: serial("id").primaryKey(),
  tokenNumber: text("token_number").notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  tokenDate: date("token_date").notNull(),
  visitPurpose: text("visit_purpose"),
  priority: text("priority").default("normal"), // normal, urgent, emergency
  status: text("status").default("waiting"), // waiting, in-consultation, completed, cancelled
  queuePosition: integer("queue_position"),
  estimatedTime: timestamp("estimated_time"),
  checkInTime: timestamp("check_in_time"),
  consultationStartTime: timestamp("consultation_start_time"),
  consultationEndTime: timestamp("consultation_end_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOpTokenSchema = createInsertSchema(opTokens).omit({ id: true, createdAt: true });

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  opTokenId: integer("op_token_id"),
  date: timestamp("date").notNull(),
  timeSlot: text("time_slot"),
  type: text("type").default("consultation"), // consultation, follow-up, telemedicine, procedure
  reason: text("reason").notNull(),
  symptoms: text("symptoms"),
  chequeNumber: text("cheque_number"),
  status: text("status").notNull().default("scheduled"), // scheduled, confirmed, in-progress, completed, cancelled, no-show
  notes: text("notes"),
  isTelemedicine: boolean("is_telemedicine").default(false),
  meetingLink: text("meeting_link"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true }).extend({
  date: z.union([z.string(), z.date()]).transform((val) => typeof val === 'string' ? new Date(val) : val),
});

// Patient Vitals (For Nurse Dashboard)
export const patientVitals = pgTable("patient_vitals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  appointmentId: integer("appointment_id"),
  recordedBy: integer("recorded_by"), // nurse/staff user id
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  oxygenSaturation: integer("oxygen_saturation"),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  height: decimal("height", { precision: 5, scale: 2 }),
  bmi: decimal("bmi", { precision: 4, scale: 1 }),
  bloodSugar: decimal("blood_sugar", { precision: 5, scale: 2 }),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const insertPatientVitalsSchema = createInsertSchema(patientVitals).omit({ id: true, recordedAt: true });

// Prescriptions
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  prescriptionUid: text("prescription_uid").notNull().unique(),
  appointmentId: integer("appointment_id").references(() => appointments.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  diagnosis: text("diagnosis"),
  medications: text("medications").notNull(), // JSON string of medications
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  duration: text("duration").notNull(),
  instructions: text("instructions"),
  notes: text("notes"),
  isDispensed: boolean("is_dispensed").default(false),
  dispensedBy: integer("dispensed_by"),
  dispensedAt: timestamp("dispensed_at"),
  paymentStatus: text("payment_status").default("unbilled"), // unbilled, pending, paid
  invoiceId: integer("invoice_id"),
  medicationCost: decimal("medication_cost", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, createdAt: true });

// Lab Reports
export const labReports = pgTable("lab_reports", {
  id: serial("id").primaryKey(),
  reportUid: text("report_uid").notNull().unique(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id"),
  appointmentId: integer("appointment_id"),
  testName: text("test_name").notNull(),
  testCategory: text("test_category"),
  testDate: date("test_date").notNull(),
  results: text("results").notNull(),
  resultDetails: text("result_details"), // JSON for detailed results
  status: text("status").notNull().default("pending"), // pending, processing, completed, verified
  paymentStatus: text("payment_status").notNull().default("pending_payment"), // pending_payment, paid, waived
  invoiceId: integer("invoice_id"), // linked invoice when paid
  testPrice: decimal("test_price", { precision: 10, scale: 2 }).default("50.00"), // price of the test
  priority: text("priority").default("routine"), // routine, urgent, stat
  clinicalNotes: text("clinical_notes"), // doctor's notes for why test is needed
  normalRange: text("normal_range"),
  interpretation: text("interpretation"),
  doctorNotes: text("doctor_notes"),
  technician: text("technician"),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  reportFile: text("report_file"), // file path/url
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLabReportSchema = createInsertSchema(labReports).omit({ id: true, createdAt: true });

// Doctor Ratings
export const doctorRatings = pgTable("doctor_ratings", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  appointmentId: integer("appointment_id"),
  rating: integer("rating").notNull(),
  review: text("review"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDoctorRatingSchema = createInsertSchema(doctorRatings).omit({ id: true, createdAt: true });

// Wards
export const wards = pgTable("wards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // general, icu, private, semi-private, emergency
  departmentId: integer("department_id").references(() => departments.id),
  floor: text("floor"),
  totalBeds: integer("total_beds").notNull(),
  occupiedBeds: integer("occupied_beds").default(0),
  chargesPerDay: decimal("charges_per_day", { precision: 10, scale: 2 }),
  nurseInCharge: integer("nurse_in_charge"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWardSchema = createInsertSchema(wards).omit({ id: true, createdAt: true });

// Individual Beds (Bed Management)
export const beds = pgTable("beds", {
  id: serial("id").primaryKey(),
  bedNumber: text("bed_number").notNull(),
  wardId: integer("ward_id").references(() => wards.id).notNull(),
  bedType: text("bed_type").default("standard"), // standard, electric, icu, pediatric
  status: text("status").default("available"), // available, occupied, reserved, maintenance, cleaning
  currentPatientId: integer("current_patient_id"),
  features: text("features"), // JSON array of features
  lastCleanedAt: timestamp("last_cleaned_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBedSchema = createInsertSchema(beds).omit({ id: true, createdAt: true });

// Ward Assignments (Admissions)
export const wardAssignments = pgTable("ward_assignments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  wardId: integer("ward_id").references(() => wards.id).notNull(),
  bedId: integer("bed_id").references(() => beds.id),
  bedNumber: text("bed_number").notNull(),
  admissionDate: timestamp("admission_date").notNull(),
  expectedDischargeDate: timestamp("expected_discharge_date"),
  dischargeDate: timestamp("discharge_date"),
  admissionReason: text("admission_reason"),
  attendingDoctorId: integer("attending_doctor_id"),
  status: text("status").notNull().default("active"), // active, discharged, transferred
  dischargeSummary: text("discharge_summary"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWardAssignmentSchema = createInsertSchema(wardAssignments).omit({ id: true, createdAt: true });

// Nurse Tasks (For Nurse Dashboard)
export const nurseTasks = pgTable("nurse_tasks", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  wardId: integer("ward_id"),
  assignedTo: integer("assigned_to"), // nurse user id
  assignedBy: integer("assigned_by"), // doctor/admin user id
  taskType: text("task_type").notNull(), // medication, vitals, dressing, injection, monitoring, other
  description: text("description").notNull(),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  scheduledTime: timestamp("scheduled_time"),
  completedTime: timestamp("completed_time"),
  status: text("status").default("pending"), // pending, in-progress, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNurseTaskSchema = createInsertSchema(nurseTasks).omit({ id: true, createdAt: true });

// Staff
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  designation: text("designation").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  shift: text("shift").notNull(),
  joiningDate: date("joining_date"),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStaffSchema = createInsertSchema(staff).omit({ id: true, createdAt: true });

// Insurance Providers
export const insuranceProviders = pgTable("insurance_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // government, private, corporate
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  panelHospital: boolean("panel_hospital").default(true),
  cashlessEnabled: boolean("cashless_enabled").default(false),
  reimbursementEnabled: boolean("reimbursement_enabled").default(true),
  tpaName: text("tpa_name"), // Third Party Administrator
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInsuranceProviderSchema = createInsertSchema(insuranceProviders).omit({ id: true, createdAt: true });

// Insurance Claims
export const insuranceClaims = pgTable("insurance_claims", {
  id: serial("id").primaryKey(),
  claimNumber: text("claim_number").notNull().unique(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  insuranceProviderId: integer("insurance_provider_id").references(() => insuranceProviders.id).notNull(),
  invoiceId: integer("invoice_id"),
  policyNumber: text("policy_number").notNull(),
  claimType: text("claim_type").notNull(), // cashless, reimbursement
  claimAmount: decimal("claim_amount", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  status: text("status").default("submitted"), // submitted, pre-authorized, approved, rejected, settled, pending-documents
  submissionDate: date("submission_date").notNull(),
  approvalDate: date("approval_date"),
  settlementDate: date("settlement_date"),
  rejectionReason: text("rejection_reason"),
  documents: text("documents"), // JSON array of document paths
  notes: text("notes"),
  processedBy: integer("processed_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInsuranceClaimSchema = createInsertSchema(insuranceClaims).omit({ id: true, createdAt: true });

// Pre-Authorization Requests
export const preAuthorizations = pgTable("pre_authorizations", {
  id: serial("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  insuranceProviderId: integer("insurance_provider_id").references(() => insuranceProviders.id).notNull(),
  policyNumber: text("policy_number").notNull(),
  treatmentType: text("treatment_type").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  status: text("status").default("pending"), // pending, approved, rejected, expired
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPreAuthorizationSchema = createInsertSchema(preAuthorizations).omit({ id: true, createdAt: true });

// Medicine Categories
export const medicineCategories = pgTable("medicine_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMedicineCategorySchema = createInsertSchema(medicineCategories).omit({ id: true, createdAt: true });

// Medicine Forms
export const medicineForms = pgTable("medicine_forms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // tablet, capsule, syrup, injection, cream, etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMedicineFormSchema = createInsertSchema(medicineForms).omit({ id: true, createdAt: true });

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // medicine, equipment, surgical, general
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  paymentTerms: text("payment_terms"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });

// Medicines Inventory
export const medicines = pgTable("medicines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  code: text("code").notNull().unique(),
  categoryId: integer("category_id").references(() => medicineCategories.id),
  formId: integer("form_id").references(() => medicineForms.id),
  manufacturer: text("manufacturer"),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  batchNumber: text("batch_number"),
  expiryDate: date("expiry_date"),
  quantity: integer("quantity").default(0),
  reorderLevel: integer("reorder_level").default(10),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  gstPercentage: decimal("gst_percentage", { precision: 5, scale: 2 }).default("0"),
  location: text("location"), // storage location
  requiresPrescription: boolean("requires_prescription").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMedicineSchema = createInsertSchema(medicines).omit({ id: true, createdAt: true });

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  orderDate: date("order_date").notNull(),
  expectedDeliveryDate: date("expected_delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, approved, ordered, delivered, cancelled
  items: text("items").notNull(), // JSON array of items
  notes: text("notes"),
  approvedBy: integer("approved_by"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true });

// Surgical Supplies
export const surgicalSupplies = pgTable("surgical_supplies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  category: text("category"), // sutures, gloves, instruments, implants
  supplierId: integer("supplier_id").references(() => suppliers.id),
  quantity: integer("quantity").default(0),
  reorderLevel: integer("reorder_level").default(5),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  expiryDate: date("expiry_date"),
  sterile: boolean("sterile").default(true),
  singleUse: boolean("single_use").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSurgicalSupplySchema = createInsertSchema(surgicalSupplies).omit({ id: true, createdAt: true });

// Ambulances
export const ambulances = pgTable("ambulances", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  vehicleType: text("vehicle_type").notNull(), // basic, advanced, icu, neonatal
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  paramedicName: text("paramedic_name"),
  status: text("status").default("available"), // available, on-duty, maintenance, unavailable
  currentLocation: text("current_location"),
  equipment: text("equipment"), // JSON array of equipment
  lastMaintenanceDate: date("last_maintenance_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAmbulanceSchema = createInsertSchema(ambulances).omit({ id: true, createdAt: true });

// Ambulance Bookings
export const ambulanceBookings = pgTable("ambulance_bookings", {
  id: serial("id").primaryKey(),
  bookingNumber: text("booking_number").notNull().unique(),
  patientId: integer("patient_id"),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  ambulanceId: integer("ambulance_id").references(() => ambulances.id),
  pickupLocation: text("pickup_location").notNull(),
  dropLocation: text("drop_location").notNull(),
  emergencyType: text("emergency_type"), // accident, cardiac, stroke, pregnancy, other
  requestedTime: timestamp("requested_time").notNull(),
  dispatchTime: timestamp("dispatch_time"),
  arrivalTime: timestamp("arrival_time"),
  completionTime: timestamp("completion_time"),
  status: text("status").default("requested"), // requested, dispatched, arrived, in-transit, completed, cancelled
  distance: decimal("distance", { precision: 6, scale: 2 }),
  fare: decimal("fare", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").default("pending"), // pending, paid, waived
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAmbulanceBookingSchema = createInsertSchema(ambulanceBookings).omit({ id: true, createdAt: true });

// Billing/Invoices (Enhanced)
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  wardAssignmentId: integer("ward_assignment_id"),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date"),
  
  // Fee breakdown
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }).default("0"),
  labFee: decimal("lab_fee", { precision: 10, scale: 2 }).default("0"),
  medicationCost: decimal("medication_cost", { precision: 10, scale: 2 }).default("0"),
  procedureCost: decimal("procedure_cost", { precision: 10, scale: 2 }).default("0"),
  hospitalCharges: decimal("hospital_charges", { precision: 10, scale: 2 }).default("0"),
  roomCharges: decimal("room_charges", { precision: 10, scale: 2 }).default("0"),
  ambulanceCharges: decimal("ambulance_charges", { precision: 10, scale: 2 }).default("0"),
  otherCharges: decimal("other_charges", { precision: 10, scale: 2 }).default("0"),
  
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  discountReason: text("discount_reason"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  balanceAmount: decimal("balance_amount", { precision: 12, scale: 2 }),
  
  // Insurance
  insuranceClaimId: integer("insurance_claim_id"),
  insuranceCoveredAmount: decimal("insurance_covered_amount", { precision: 12, scale: 2 }).default("0"),
  patientPayableAmount: decimal("patient_payable_amount", { precision: 12, scale: 2 }),
  
  status: text("status").notNull().default("pending"), // pending, partially-paid, paid, overdue, cancelled
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  
  itemDetails: text("item_details"), // JSON for detailed line items
  notes: text("notes"),
  generatedBy: integer("generated_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });

// Payment Transactions
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, card, upi, netbanking, cheque
  paymentGateway: text("payment_gateway"),
  referenceNumber: text("reference_number"),
  status: text("status").default("completed"), // pending, completed, failed, refunded
  receivedBy: integer("received_by"),
  transactionDate: timestamp("transaction_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({ id: true, createdAt: true });

// ============ RELATIONS ============

export const usersRelations = relations(users, ({ one }) => ({
  department: one(departments, { fields: [users.departmentId], references: [departments.id] }),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  department: one(departments, { fields: [doctors.departmentId], references: [departments.id] }),
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  ratings: many(doctorRatings),
  opTokens: many(opTokens),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  insuranceProvider: one(insuranceProviders, { fields: [patients.insuranceProviderId], references: [insuranceProviders.id] }),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  labReports: many(labReports),
  ratings: many(doctorRatings),
  wardAssignments: many(wardAssignments),
  invoices: many(invoices),
  vitals: many(patientVitals),
  opTokens: many(opTokens),
  nurseTasks: many(nurseTasks),
  insuranceClaims: many(insuranceClaims),
}));

export const opTokensRelations = relations(opTokens, ({ one }) => ({
  patient: one(patients, { fields: [opTokens.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [opTokens.doctorId], references: [doctors.id] }),
  department: one(departments, { fields: [opTokens.departmentId], references: [departments.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  department: one(departments, { fields: [appointments.departmentId], references: [departments.id] }),
  prescription: many(prescriptions),
  invoice: many(invoices),
  vitals: many(patientVitals),
}));

export const patientVitalsRelations = relations(patientVitals, ({ one }) => ({
  patient: one(patients, { fields: [patientVitals.patientId], references: [patients.id] }),
  appointment: one(appointments, { fields: [patientVitals.appointmentId], references: [appointments.id] }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  appointment: one(appointments, { fields: [prescriptions.appointmentId], references: [appointments.id] }),
  patient: one(patients, { fields: [prescriptions.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [prescriptions.doctorId], references: [doctors.id] }),
}));

export const labReportsRelations = relations(labReports, ({ one }) => ({
  patient: one(patients, { fields: [labReports.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [labReports.doctorId], references: [doctors.id] }),
  appointment: one(appointments, { fields: [labReports.appointmentId], references: [appointments.id] }),
}));

export const wardAssignmentsRelations = relations(wardAssignments, ({ one }) => ({
  patient: one(patients, { fields: [wardAssignments.patientId], references: [patients.id] }),
  ward: one(wards, { fields: [wardAssignments.wardId], references: [wards.id] }),
  bed: one(beds, { fields: [wardAssignments.bedId], references: [beds.id] }),
  attendingDoctor: one(doctors, { fields: [wardAssignments.attendingDoctorId], references: [doctors.id] }),
}));

export const bedsRelations = relations(beds, ({ one, many }) => ({
  ward: one(wards, { fields: [beds.wardId], references: [wards.id] }),
  currentPatient: one(patients, { fields: [beds.currentPatientId], references: [patients.id] }),
  assignments: many(wardAssignments),
}));

export const wardsRelations = relations(wards, ({ one, many }) => ({
  department: one(departments, { fields: [wards.departmentId], references: [departments.id] }),
  beds: many(beds),
  assignments: many(wardAssignments),
  tasks: many(nurseTasks),
}));

export const nurseTasksRelations = relations(nurseTasks, ({ one }) => ({
  patient: one(patients, { fields: [nurseTasks.patientId], references: [patients.id] }),
  ward: one(wards, { fields: [nurseTasks.wardId], references: [wards.id] }),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  doctors: many(doctors),
  wards: many(wards),
  staff: many(staff),
  appointments: many(appointments),
  opTokens: many(opTokens),
}));

export const insuranceProvidersRelations = relations(insuranceProviders, ({ many }) => ({
  patients: many(patients),
  claims: many(insuranceClaims),
  preAuthorizations: many(preAuthorizations),
}));

export const insuranceClaimsRelations = relations(insuranceClaims, ({ one }) => ({
  patient: one(patients, { fields: [insuranceClaims.patientId], references: [patients.id] }),
  insuranceProvider: one(insuranceProviders, { fields: [insuranceClaims.insuranceProviderId], references: [insuranceProviders.id] }),
  invoice: one(invoices, { fields: [insuranceClaims.invoiceId], references: [invoices.id] }),
}));

export const preAuthorizationsRelations = relations(preAuthorizations, ({ one }) => ({
  patient: one(patients, { fields: [preAuthorizations.patientId], references: [patients.id] }),
  insuranceProvider: one(insuranceProviders, { fields: [preAuthorizations.insuranceProviderId], references: [insuranceProviders.id] }),
}));

export const medicinesRelations = relations(medicines, ({ one }) => ({
  category: one(medicineCategories, { fields: [medicines.categoryId], references: [medicineCategories.id] }),
  form: one(medicineForms, { fields: [medicines.formId], references: [medicineForms.id] }),
  supplier: one(suppliers, { fields: [medicines.supplierId], references: [suppliers.id] }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one }) => ({
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
}));

export const surgicalSuppliesRelations = relations(surgicalSupplies, ({ one }) => ({
  supplier: one(suppliers, { fields: [surgicalSupplies.supplierId], references: [suppliers.id] }),
}));

export const ambulanceBookingsRelations = relations(ambulanceBookings, ({ one }) => ({
  patient: one(patients, { fields: [ambulanceBookings.patientId], references: [patients.id] }),
  ambulance: one(ambulances, { fields: [ambulanceBookings.ambulanceId], references: [ambulances.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  patient: one(patients, { fields: [invoices.patientId], references: [patients.id] }),
  appointment: one(appointments, { fields: [invoices.appointmentId], references: [appointments.id] }),
  insuranceClaim: one(insuranceClaims, { fields: [invoices.insuranceClaimId], references: [insuranceClaims.id] }),
  transactions: many(paymentTransactions),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  invoice: one(invoices, { fields: [paymentTransactions.invoiceId], references: [invoices.id] }),
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").references(() => users.id), // The user who receives the notification
  recipientDoctorId: integer("recipient_doctor_id").references(() => doctors.id), // Or doctor who receives it
  type: text("type").notNull(), // appointment, lab, pharmacy, alert, info
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"), // ID of related entity (appointment, lab report, etc.)
  relatedType: text("related_type"), // Type of related entity
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, { fields: [notifications.recipientId], references: [users.id] }),
  recipientDoctor: one(doctors, { fields: [notifications.recipientDoctorId], references: [doctors.id] }),
}));

// ============ TYPES ============

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type OpToken = typeof opTokens.$inferSelect;
export type InsertOpToken = z.infer<typeof insertOpTokenSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type PatientVitals = typeof patientVitals.$inferSelect;
export type InsertPatientVitals = z.infer<typeof insertPatientVitalsSchema>;

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;

export type LabReport = typeof labReports.$inferSelect;
export type InsertLabReport = z.infer<typeof insertLabReportSchema>;

export type DoctorRating = typeof doctorRatings.$inferSelect;
export type InsertDoctorRating = z.infer<typeof insertDoctorRatingSchema>;

export type Ward = typeof wards.$inferSelect;
export type InsertWard = z.infer<typeof insertWardSchema>;

export type Bed = typeof beds.$inferSelect;
export type InsertBed = z.infer<typeof insertBedSchema>;

export type WardAssignment = typeof wardAssignments.$inferSelect;
export type InsertWardAssignment = z.infer<typeof insertWardAssignmentSchema>;

export type NurseTask = typeof nurseTasks.$inferSelect;
export type InsertNurseTask = z.infer<typeof insertNurseTaskSchema>;

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export type InsuranceProvider = typeof insuranceProviders.$inferSelect;
export type InsertInsuranceProvider = z.infer<typeof insertInsuranceProviderSchema>;

export type InsuranceClaim = typeof insuranceClaims.$inferSelect;
export type InsertInsuranceClaim = z.infer<typeof insertInsuranceClaimSchema>;

export type PreAuthorization = typeof preAuthorizations.$inferSelect;
export type InsertPreAuthorization = z.infer<typeof insertPreAuthorizationSchema>;

export type MedicineCategory = typeof medicineCategories.$inferSelect;
export type InsertMedicineCategory = z.infer<typeof insertMedicineCategorySchema>;

export type MedicineForm = typeof medicineForms.$inferSelect;
export type InsertMedicineForm = z.infer<typeof insertMedicineFormSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Medicine = typeof medicines.$inferSelect;
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export type SurgicalSupply = typeof surgicalSupplies.$inferSelect;
export type InsertSurgicalSupply = z.infer<typeof insertSurgicalSupplySchema>;

export type Ambulance = typeof ambulances.$inferSelect;
export type InsertAmbulance = z.infer<typeof insertAmbulanceSchema>;

export type AmbulanceBooking = typeof ambulanceBookings.$inferSelect;
export type InsertAmbulanceBooking = z.infer<typeof insertAmbulanceBookingSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
