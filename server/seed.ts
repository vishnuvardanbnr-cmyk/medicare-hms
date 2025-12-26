import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  console.log("Seeding database...");
  
  try {
    const existingDepts = await storage.getDepartments();
    if (existingDepts.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    const cardiology = await storage.createDepartment({ name: "Cardiology", code: "CARD", description: "Heart and cardiovascular care", headDoctorId: null, isActive: true });
    const orthopedics = await storage.createDepartment({ name: "Orthopedics", code: "ORTH", description: "Bone and joint care", headDoctorId: null, isActive: true });
    const pediatrics = await storage.createDepartment({ name: "Pediatrics", code: "PEDS", description: "Child healthcare", headDoctorId: null, isActive: true });
    const neurology = await storage.createDepartment({ name: "Neurology", code: "NEUR", description: "Brain and nervous system", headDoctorId: null, isActive: true });
    const dermatology = await storage.createDepartment({ name: "Dermatology", code: "DERM", description: "Skin care and treatment", headDoctorId: null, isActive: true });
    const generalMedicine = await storage.createDepartment({ name: "General Medicine", code: "GENM", description: "Primary care and general health", headDoctorId: null, isActive: true });

    const adminPassword = await hashPassword("admin123");
    await storage.createUser({ email: "admin@hospital.com", password: adminPassword, name: "System Admin", role: "admin", isActive: true });

    const doc1 = await storage.createDoctor({ name: "Sarah Johnson", specialty: "Cardiologist", email: "sarah.johnson@hospital.com", phone: "+1-555-0101", departmentId: cardiology.id, qualifications: "MD, FACC", experience: 15, consultationFee: "150.00", isAvailable: true });
    const doc2 = await storage.createDoctor({ name: "Michael Chen", specialty: "Orthopedic Surgeon", email: "michael.chen@hospital.com", phone: "+1-555-0102", departmentId: orthopedics.id, qualifications: "MD, FAAOS", experience: 12, consultationFee: "175.00", isAvailable: true });
    const doc3 = await storage.createDoctor({ name: "Emily Rodriguez", specialty: "Pediatrician", email: "emily.rodriguez@hospital.com", phone: "+1-555-0103", departmentId: pediatrics.id, qualifications: "MD, FAAP", experience: 10, consultationFee: "120.00", isAvailable: true });
    const doc4 = await storage.createDoctor({ name: "James Wilson", specialty: "Neurologist", email: "james.wilson@hospital.com", phone: "+1-555-0104", departmentId: neurology.id, qualifications: "MD, PhD", experience: 18, consultationFee: "200.00", isAvailable: true });
    const doc5 = await storage.createDoctor({ name: "Lisa Park", specialty: "Dermatologist", email: "lisa.park@hospital.com", phone: "+1-555-0105", departmentId: dermatology.id, qualifications: "MD, FAAD", experience: 8, consultationFee: "140.00", isAvailable: true });

    const pat1 = await storage.createPatient({ name: "John Smith", email: "john.smith@email.com", phone: "+1-555-1001", dob: "1985-03-15", gender: "male", bloodGroup: "A+", address: "123 Main St, City", emergencyContact: "+1-555-1002", medicalHistory: "No major conditions" });
    const pat2 = await storage.createPatient({ name: "Maria Garcia", email: "maria.garcia@email.com", phone: "+1-555-1003", dob: "1992-07-22", gender: "female", bloodGroup: "O+", address: "456 Oak Ave, Town", emergencyContact: "+1-555-1004", medicalHistory: "Mild asthma" });
    const pat3 = await storage.createPatient({ name: "Robert Johnson", email: "robert.j@email.com", phone: "+1-555-1005", dob: "1978-11-08", gender: "male", bloodGroup: "B+", address: "789 Pine Rd, Village", emergencyContact: "+1-555-1006", medicalHistory: "Type 2 Diabetes" });
    const pat4 = await storage.createPatient({ name: "Emma Davis", email: "emma.davis@email.com", phone: "+1-555-1007", dob: "2018-05-12", gender: "female", bloodGroup: "AB+", address: "321 Elm St, City", emergencyContact: "+1-555-1008", medicalHistory: "Childhood vaccinations up to date" });
    const pat5 = await storage.createPatient({ name: "William Brown", email: "william.b@email.com", phone: "+1-555-1009", dob: "1965-09-30", gender: "male", bloodGroup: "O-", address: "654 Cedar Ln, Town", emergencyContact: "+1-555-1010", medicalHistory: "Hypertension, managed" });

    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    
    await storage.createAppointment({ patientId: pat1.id, doctorId: doc1.id, date: new Date(today.setHours(10, 0, 0, 0)), reason: "Annual heart checkup", status: "scheduled", notes: "Follow-up from last year" });
    await storage.createAppointment({ patientId: pat2.id, doctorId: doc3.id, date: new Date(today.setHours(11, 30, 0, 0)), reason: "Asthma consultation", status: "scheduled", notes: "Review inhaler usage" });
    await storage.createAppointment({ patientId: pat3.id, doctorId: doc1.id, date: new Date(today.setHours(14, 0, 0, 0)), reason: "Diabetes cardiovascular screening", status: "scheduled" });
    await storage.createAppointment({ patientId: pat4.id, doctorId: doc3.id, date: new Date(tomorrow.setHours(9, 0, 0, 0)), reason: "Vaccination appointment", status: "scheduled" });
    await storage.createAppointment({ patientId: pat5.id, doctorId: doc4.id, date: new Date(tomorrow.setHours(15, 30, 0, 0)), reason: "Headache evaluation", status: "scheduled" });

    const generalWard = await storage.createWard({ name: "General Ward A", type: "general", floor: 1, totalBeds: 20, occupiedBeds: 8, nurseInChargeId: null, isActive: true });
    const icuWard = await storage.createWard({ name: "ICU", type: "icu", floor: 2, totalBeds: 10, occupiedBeds: 4, nurseInChargeId: null, isActive: true });
    const pediatricWard = await storage.createWard({ name: "Pediatric Ward", type: "pediatric", floor: 3, totalBeds: 15, occupiedBeds: 6, nurseInChargeId: null, isActive: true });

    for (let i = 1; i <= 5; i++) { await storage.createBed({ wardId: generalWard.id, bedNumber: "GW-A" + i.toString().padStart(2, '0'), status: i <= 3 ? "occupied" : "available", type: "standard" }); }
    for (let i = 1; i <= 3; i++) { await storage.createBed({ wardId: icuWard.id, bedNumber: "ICU-" + i.toString().padStart(2, '0'), status: i <= 2 ? "occupied" : "available", type: "icu" }); }

    await storage.createInsuranceProvider({ name: "BlueCross BlueShield", contactPerson: "John Adams", phone: "+1-800-555-0001", email: "claims@bcbs.com", address: "100 Insurance Way", panelRate: "85", isActive: true });
    await storage.createInsuranceProvider({ name: "Aetna Health", contactPerson: "Mary Williams", phone: "+1-800-555-0002", email: "claims@aetna.com", address: "200 Healthcare Blvd", panelRate: "80", isActive: true });
    await storage.createInsuranceProvider({ name: "United Healthcare", contactPerson: "Robert Taylor", phone: "+1-800-555-0003", email: "claims@uhc.com", address: "300 Medical Center Dr", panelRate: "82", isActive: true });

    await storage.createMedicineCategory({ name: "Antibiotics", description: "Anti-bacterial medications" });
    await storage.createMedicineCategory({ name: "Analgesics", description: "Pain relief medications" });
    await storage.createMedicineCategory({ name: "Cardiovascular", description: "Heart and blood pressure medications" });
    await storage.createMedicineCategory({ name: "Antidiabetics", description: "Diabetes management medications" });
    await storage.createMedicineCategory({ name: "Vitamins", description: "Nutritional supplements" });

    await storage.createMedicineForm({ name: "Tablet", description: "Oral solid dosage" });
    await storage.createMedicineForm({ name: "Capsule", description: "Gelatin encased medication" });
    await storage.createMedicineForm({ name: "Syrup", description: "Liquid oral medication" });
    await storage.createMedicineForm({ name: "Injection", description: "Injectable medication" });
    await storage.createMedicineForm({ name: "Cream", description: "Topical application" });

    await storage.createSupplier({ name: "PharmaCorp Inc", contactPerson: "Steve Miller", phone: "+1-555-2001", email: "orders@pharmacorp.com", address: "500 Pharma Way, Industrial District", isActive: true });
    await storage.createSupplier({ name: "MedSupply Global", contactPerson: "Jennifer Lee", phone: "+1-555-2002", email: "supply@medsupply.com", address: "600 Medical Plaza", isActive: true });

    await storage.createAmbulance({ vehicleNumber: "AMB-001", type: "als", driverName: "Tom Harris", driverPhone: "+1-555-3001", status: "available", currentLocation: "Hospital Base" });
    await storage.createAmbulance({ vehicleNumber: "AMB-002", type: "bls", driverName: "Mike Johnson", driverPhone: "+1-555-3002", status: "available", currentLocation: "Hospital Base" });
    await storage.createAmbulance({ vehicleNumber: "AMB-003", type: "als", driverName: "David Chen", driverPhone: "+1-555-3003", status: "on_call", currentLocation: "Downtown Area" });

    await storage.createStaff({ name: "Nancy Wilson", email: "nancy.wilson@hospital.com", phone: "+1-555-4001", role: "nurse", departmentId: generalMedicine.id, shift: "morning", isActive: true });
    await storage.createStaff({ name: "Patricia Brown", email: "patricia.brown@hospital.com", phone: "+1-555-4002", role: "nurse", departmentId: cardiology.id, shift: "evening", isActive: true });
    await storage.createStaff({ name: "Kevin Anderson", email: "kevin.anderson@hospital.com", phone: "+1-555-4003", role: "receptionist", departmentId: null, shift: "morning", isActive: true });
    await storage.createStaff({ name: "Sandra Martinez", email: "sandra.martinez@hospital.com", phone: "+1-555-4004", role: "pharmacist", departmentId: null, shift: "morning", isActive: true });

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
