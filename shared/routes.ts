import { z } from "zod";
import { 
  insertDoctorSchema, insertPatientSchema, insertAppointmentSchema, insertPrescriptionSchema,
  insertLabReportSchema, insertDoctorRatingSchema, insertWardSchema, insertWardAssignmentSchema,
  insertStaffSchema, insertInvoiceSchema, insertDepartmentSchema, insertOpTokenSchema,
  insertPatientVitalsSchema, insertNurseTaskSchema, insertBedSchema, insertInsuranceProviderSchema,
  insertInsuranceClaimSchema, insertPreAuthorizationSchema, insertMedicineCategorySchema,
  insertMedicineFormSchema, insertSupplierSchema, insertMedicineSchema, insertPurchaseOrderSchema,
  insertSurgicalSupplySchema, insertAmbulanceSchema, insertAmbulanceBookingSchema,
  insertPaymentTransactionSchema
} from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: { 
    getUser: { method: "GET" as const, path: "/api/auth/user", responses: { 200: z.any(), 401: errorSchemas.notFound } },
    signup: { method: "POST" as const, path: "/api/auth/signup", responses: { 201: z.any(), 400: errorSchemas.validation } },
    login: { method: "POST" as const, path: "/api/auth/login", responses: { 200: z.any(), 401: errorSchemas.notFound } },
    logout: { method: "POST" as const, path: "/api/auth/logout", responses: { 200: z.any() } },
  },
  
  // Departments
  departments: { 
    list: { method: "GET" as const, path: "/api/departments", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/departments", input: insertDepartmentSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/departments/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/departments/:id", input: insertDepartmentSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Doctors
  doctors: {
    list: { method: "GET" as const, path: "/api/doctors", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/doctors", input: insertDoctorSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/doctors/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/doctors/:id", input: insertDoctorSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    byDepartment: { method: "GET" as const, path: "/api/doctors/department/:id", responses: { 200: z.array(z.any()) } },
  },

  // Patients (OP Registration)
  patients: {
    list: { method: "GET" as const, path: "/api/patients", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/patients", input: insertPatientSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/patients/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/patients/:id", input: insertPatientSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    search: { method: "GET" as const, path: "/api/patients/search", responses: { 200: z.array(z.any()) } },
    byUid: { method: "GET" as const, path: "/api/patients/uid/:uid", responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // OP Tokens
  opTokens: {
    list: { method: "GET" as const, path: "/api/op-tokens", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/op-tokens", input: insertOpTokenSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/op-tokens/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/op-tokens/:id", input: insertOpTokenSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    byDoctor: { method: "GET" as const, path: "/api/op-tokens/doctor/:id", responses: { 200: z.array(z.any()) } },
    byPatient: { method: "GET" as const, path: "/api/op-tokens/patient/:id", responses: { 200: z.array(z.any()) } },
  },

  // Appointments
  appointments: {
    list: { method: "GET" as const, path: "/api/appointments", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/appointments", input: insertAppointmentSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/appointments/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/appointments/:id", input: insertAppointmentSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    byDoctor: { method: "GET" as const, path: "/api/appointments/doctor/:id", responses: { 200: z.array(z.any()) } },
    byPatient: { method: "GET" as const, path: "/api/appointments/patient/:id", responses: { 200: z.array(z.any()) } },
  },

  // Patient Vitals
  vitals: {
    list: { method: "GET" as const, path: "/api/vitals/patient/:id", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/vitals", input: insertPatientVitalsSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    latest: { method: "GET" as const, path: "/api/vitals/patient/:id/latest", responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Prescriptions
  prescriptions: {
    list: { method: "GET" as const, path: "/api/prescriptions", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/prescriptions", input: insertPrescriptionSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/prescriptions/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/prescriptions/:id", input: insertPrescriptionSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    byPatient: { method: "GET" as const, path: "/api/prescriptions/patient/:id", responses: { 200: z.array(z.any()) } },
  },

  // Lab Reports
  labReports: {
    list: { method: "GET" as const, path: "/api/lab-reports", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/lab-reports", input: insertLabReportSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/lab-reports/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/lab-reports/:id", input: insertLabReportSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    byPatient: { method: "GET" as const, path: "/api/lab-reports/patient/:id", responses: { 200: z.array(z.any()) } },
  },

  // Ratings
  ratings: {
    create: { method: "POST" as const, path: "/api/ratings", input: insertDoctorRatingSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    getByDoctor: { method: "GET" as const, path: "/api/ratings/doctor/:id", responses: { 200: z.array(z.any()) } },
  },

  // Wards
  wards: {
    list: { method: "GET" as const, path: "/api/wards", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/wards", input: insertWardSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/wards/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/wards/:id", input: insertWardSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Beds
  beds: {
    list: { method: "GET" as const, path: "/api/beds", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/beds", input: insertBedSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/beds/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/beds/:id", input: insertBedSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    byWard: { method: "GET" as const, path: "/api/beds/ward/:id", responses: { 200: z.array(z.any()) } },
  },

  // Ward Assignments (Admissions)
  wardAssignments: {
    list: { method: "GET" as const, path: "/api/ward-assignments", responses: { 200: z.array(z.any()) } },
    active: { method: "GET" as const, path: "/api/ward-assignments/active", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/ward-assignments", input: insertWardAssignmentSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    update: { method: "PUT" as const, path: "/api/ward-assignments/:id", input: insertWardAssignmentSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Nurse Tasks
  nurseTasks: {
    list: { method: "GET" as const, path: "/api/nurse-tasks", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/nurse-tasks", input: insertNurseTaskSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    update: { method: "PUT" as const, path: "/api/nurse-tasks/:id", input: insertNurseTaskSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    byAssignee: { method: "GET" as const, path: "/api/nurse-tasks/assignee/:id", responses: { 200: z.array(z.any()) } },
    byPatient: { method: "GET" as const, path: "/api/nurse-tasks/patient/:id", responses: { 200: z.array(z.any()) } },
  },

  // Staff
  staff: {
    list: { method: "GET" as const, path: "/api/staff", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/staff", input: insertStaffSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/staff/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/staff/:id", input: insertStaffSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Insurance Providers
  insuranceProviders: {
    list: { method: "GET" as const, path: "/api/insurance-providers", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/insurance-providers", input: insertInsuranceProviderSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/insurance-providers/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/insurance-providers/:id", input: insertInsuranceProviderSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Insurance Claims
  insuranceClaims: {
    list: { method: "GET" as const, path: "/api/insurance-claims", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/insurance-claims", input: insertInsuranceClaimSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/insurance-claims/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/insurance-claims/:id", input: insertInsuranceClaimSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Pre-Authorizations
  preAuthorizations: {
    list: { method: "GET" as const, path: "/api/pre-authorizations", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/pre-authorizations", input: insertPreAuthorizationSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    update: { method: "PUT" as const, path: "/api/pre-authorizations/:id", input: insertPreAuthorizationSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Pharma - Medicine Categories
  medicineCategories: {
    list: { method: "GET" as const, path: "/api/medicine-categories", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/medicine-categories", input: insertMedicineCategorySchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
  },

  // Pharma - Medicine Forms
  medicineForms: {
    list: { method: "GET" as const, path: "/api/medicine-forms", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/medicine-forms", input: insertMedicineFormSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
  },

  // Pharma - Suppliers
  suppliers: {
    list: { method: "GET" as const, path: "/api/suppliers", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/suppliers", input: insertSupplierSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/suppliers/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/suppliers/:id", input: insertSupplierSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Pharma - Medicines
  medicines: {
    list: { method: "GET" as const, path: "/api/medicines", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/medicines", input: insertMedicineSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/medicines/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/medicines/:id", input: insertMedicineSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    lowStock: { method: "GET" as const, path: "/api/medicines/low-stock", responses: { 200: z.array(z.any()) } },
    expired: { method: "GET" as const, path: "/api/medicines/expired", responses: { 200: z.array(z.any()) } },
  },

  // Pharma - Purchase Orders
  purchaseOrders: {
    list: { method: "GET" as const, path: "/api/purchase-orders", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/purchase-orders", input: insertPurchaseOrderSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    update: { method: "PUT" as const, path: "/api/purchase-orders/:id", input: insertPurchaseOrderSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Pharma - Surgical Supplies
  surgicalSupplies: {
    list: { method: "GET" as const, path: "/api/surgical-supplies", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/surgical-supplies", input: insertSurgicalSupplySchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    update: { method: "PUT" as const, path: "/api/surgical-supplies/:id", input: insertSurgicalSupplySchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Ambulances
  ambulances: {
    list: { method: "GET" as const, path: "/api/ambulances", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/ambulances", input: insertAmbulanceSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/ambulances/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/ambulances/:id", input: insertAmbulanceSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    available: { method: "GET" as const, path: "/api/ambulances/available", responses: { 200: z.array(z.any()) } },
  },

  // Ambulance Bookings
  ambulanceBookings: {
    list: { method: "GET" as const, path: "/api/ambulance-bookings", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/ambulance-bookings", input: insertAmbulanceBookingSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    update: { method: "PUT" as const, path: "/api/ambulance-bookings/:id", input: insertAmbulanceBookingSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },

  // Invoices (Cashier)
  invoices: {
    list: { method: "GET" as const, path: "/api/invoices", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/invoices", input: insertInvoiceSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: "GET" as const, path: "/api/invoices/:id", responses: { 200: z.any(), 404: errorSchemas.notFound } },
    update: { method: "PUT" as const, path: "/api/invoices/:id", input: insertInvoiceSchema.partial(), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    byPatient: { method: "GET" as const, path: "/api/invoices/patient/:id", responses: { 200: z.array(z.any()) } },
    pending: { method: "GET" as const, path: "/api/invoices/pending", responses: { 200: z.array(z.any()) } },
  },

  // Payment Transactions
  payments: {
    list: { method: "GET" as const, path: "/api/payments", responses: { 200: z.array(z.any()) } },
    create: { method: "POST" as const, path: "/api/payments", input: insertPaymentTransactionSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
  },

  // Stats & Analytics
  stats: { 
    get: { method: "GET" as const, path: "/api/stats", responses: { 200: z.any() } },
    dashboard: { method: "GET" as const, path: "/api/stats/dashboard", responses: { 200: z.any() } },
    revenue: { method: "GET" as const, path: "/api/stats/revenue", responses: { 200: z.any() } },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) Object.entries(params).forEach(([key, value]) => { url = url.replace(`:${key}`, String(value)); });
  return url;
}
