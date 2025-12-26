# Hospital Management System

## Overview

A comprehensive hospital management system built as a full-stack TypeScript application. The system handles patient registration, doctor management, appointments, prescriptions, lab reports, ward management, pharmacy inventory, insurance claims, ambulance services, and billing. It provides role-based access control for different hospital staff including admins, doctors, nurses, receptionists, cashiers, and pharmacists.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for dashboard analytics
- **Animations**: Framer Motion for page transitions

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints with Zod schema validation
- **Session Management**: Express-session with MemoryStore (development) or connect-pg-simple (production)
- **Authentication**: Custom email/password authentication with bcrypt password hashing

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: `shared/schema.ts` contains all database table definitions
- **Migrations**: Drizzle Kit for database migrations (`npm run db:push`)

### Project Structure
```
├── client/               # React frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── hooks/        # Custom React hooks for data fetching
│       ├── pages/        # Page components for each route
│       └── lib/          # Utilities and query client setup
├── server/               # Express backend
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database access layer
│   ├── auth.ts           # Authentication utilities
│   └── db.ts             # Database connection
└── shared/               # Shared between client and server
    ├── schema.ts         # Drizzle database schema
    └── routes.ts         # API route type definitions
```

### Authentication Flow
- Session-based authentication stored server-side
- Role-based access control middleware (`requireRole`)
- Protected routes redirect unauthenticated users to login page
- User roles: admin, doctor, nurse, receptionist, cashier, pharmacist, staff
- **Multiple Login Options**: Email/password, Google OAuth, GitHub, Apple (via Replit Auth integration)
- **Note**: SMS/Twilio integration was dismissed by user - if needed in future, request Twilio credentials as secrets

### API Pattern
Routes are defined in `shared/routes.ts` with Zod schemas for type-safe request/response handling. The storage layer in `server/storage.ts` provides a clean interface for all database operations.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (connection via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and migrations

### Authentication & Security
- **bcrypt**: Password hashing
- **express-session**: Session management
- **memorystore**: Development session storage

### UI Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, tabs, etc.)
- **shadcn/ui**: Pre-styled component library
- **Lucide React**: Icon library
- **Recharts**: Chart components for analytics

### Build Tools
- **Vite**: Frontend bundler with HMR
- **esbuild**: Server-side bundling for production
- **TypeScript**: Type checking across the entire codebase

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (optional, defaults to "dev-secret")