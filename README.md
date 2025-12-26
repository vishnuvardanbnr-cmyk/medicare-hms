# MediCare HMS - Hospital Management System

A comprehensive multi-specialist hospital management system with 20+ features, role-based dashboards, and complete patient portal.

## Features

### Staff Dashboards
- **Admin Dashboard** - Full system overview, staff management, reports
- **Doctor Dashboard** - Appointments, patients, prescriptions, lab reports
- **Nurse Dashboard** - Ward assignments, patient vitals, care management
- **Receptionist Dashboard** - Patient registration, appointments, billing
- **Cashier Dashboard** - Invoices, payments, insurance claims
- **Pharmacist Dashboard** - Prescriptions, inventory, dispensing

### Patient Portal
- View and manage appointments
- Access prescriptions and medications
- View lab reports and test results
- Track bills and payment history
- Update personal profile
- Find and book doctors

### Core Modules
- **OP Registration** - Outpatient registration and management
- **Appointments** - Scheduling, queue management, notifications
- **Prescriptions** - Digital prescriptions with pharmacy integration
- **Lab Reports** - Test ordering, results, payment tracking
- **Billing** - Invoice generation, payment processing
- **Pharmacy** - Inventory management, dispensing workflow
- **Ward Management** - Bed allocation, patient admissions
- **Insurance** - Claims processing, coverage verification
- **Ambulance Services** - Fleet management, dispatch
- **Staff Attendance** - Duty timings, shift management

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Email/Password, Google OAuth
- **State Management**: TanStack React Query

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Database Setup
```bash
npm run db:push
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/medicare_hms
SESSION_SECRET=your_random_secret_32_chars
CORS_ORIGIN=http://localhost:5173  # For split deployment
```

## Deployment Guides

- **Full Stack VPS**: See `VPS_DEPLOYMENT_GUIDE.md`
- **Split Deployment** (Backend VPS + Local Frontend): See `SPLIT_DEPLOYMENT_GUIDE.md`

## Default Roles

| Role | Access |
|------|--------|
| admin | Full system access |
| doctor | Clinical features, appointments, prescriptions |
| nurse | Patient care, vitals, ward management |
| receptionist | Registration, appointments, basic billing |
| cashier | Billing, payments, insurance |
| pharmacist | Pharmacy, prescriptions, inventory |
| patient | Personal portal, appointments, records |

## Screenshots

The system features a modern, responsive UI with:
- Clean sidebar navigation
- Role-based menu items
- Dark/Light mode support
- Mobile-friendly design

## License

MIT License

---

Built with care for healthcare providers.
