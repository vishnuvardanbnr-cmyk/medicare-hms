import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Stethoscope, 
  Users, 
  Calendar, 
  Building2, 
  LogOut,
  Menu,
  X,
  Bed,
  Pill,
  Shield,
  Ambulance,
  FileText,
  ClipboardList,
  UserCog,
  CreditCard,
  Activity,
  Settings,
  Clock
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationCenter } from "@/components/notification-center";
import { QuickActions } from "@/components/quick-actions";

type NavItem = { href: string; label: string; icon: React.ElementType };

const getNavItemsByRole = (role: string | undefined) => {
  const allItems = {
    dashboard: { href: "/", label: "Dashboard", icon: LayoutDashboard },
    doctors: { href: "/doctors", label: "Doctors", icon: Stethoscope },
    patients: { href: "/patients", label: "Patients", icon: Users },
    appointments: { href: "/appointments", label: "Appointments", icon: Calendar },
    departments: { href: "/departments", label: "Departments", icon: Building2 },
    prescriptions: { href: "/prescriptions", label: "Prescriptions", icon: ClipboardList },
    labReports: { href: "/lab-reports", label: "Lab Reports", icon: FileText },
    vitals: { href: "/vitals", label: "Patient Vitals", icon: Activity },
    wards: { href: "/wards", label: "Wards & Beds", icon: Bed },
    admissions: { href: "/admissions", label: "Admissions", icon: Users },
    pharmacy: { href: "/pharmacy", label: "Pharmacy", icon: Pill },
    insurance: { href: "/insurance", label: "Insurance", icon: Shield },
    ambulance: { href: "/ambulance", label: "Ambulance", icon: Ambulance },
    billing: { href: "/billing", label: "Billing", icon: CreditCard },
    staff: { href: "/staff", label: "Staff", icon: UserCog },
    attendance: { href: "/attendance", label: "Attendance", icon: Clock },
    reports: { href: "/reports", label: "Reports", icon: FileText },
    // Patient-specific items
    myAppointments: { href: "/my-appointments", label: "My Appointments", icon: Calendar },
    myPrescriptions: { href: "/my-prescriptions", label: "My Prescriptions", icon: ClipboardList },
    myLabReports: { href: "/my-lab-reports", label: "My Lab Reports", icon: FileText },
    myBills: { href: "/my-bills", label: "My Bills", icon: CreditCard },
    myProfile: { href: "/my-profile", label: "My Profile", icon: Settings },
    findDoctor: { href: "/find-doctor", label: "Find a Doctor", icon: Stethoscope },
  };

  switch (role) {
    case 'admin':
      return {
        main: [allItems.dashboard, allItems.doctors, allItems.patients, allItems.appointments, allItems.departments],
        clinical: [allItems.prescriptions, allItems.labReports, allItems.vitals],
        inpatient: [allItems.wards, allItems.admissions],
        operations: [allItems.pharmacy, allItems.insurance, allItems.ambulance, allItems.billing],
        admin: [allItems.staff, allItems.attendance, allItems.reports],
      };
    case 'doctor':
      return {
        main: [allItems.dashboard, allItems.appointments, allItems.patients],
        clinical: [allItems.prescriptions, allItems.labReports, allItems.vitals],
        inpatient: [],
        operations: [],
        admin: [allItems.attendance],
      };
    case 'nurse':
      return {
        main: [allItems.dashboard, allItems.patients],
        clinical: [allItems.vitals],
        inpatient: [allItems.wards, allItems.admissions],
        operations: [],
        admin: [allItems.attendance],
      };
    case 'receptionist':
      return {
        main: [allItems.dashboard, allItems.patients, allItems.appointments],
        clinical: [],
        inpatient: [],
        operations: [allItems.billing],
        admin: [allItems.attendance],
      };
    case 'cashier':
      return {
        main: [allItems.dashboard],
        clinical: [],
        inpatient: [],
        operations: [allItems.billing, allItems.insurance],
        admin: [allItems.attendance],
      };
    case 'pharmacist':
      return {
        main: [allItems.dashboard],
        clinical: [allItems.prescriptions],
        inpatient: [],
        operations: [allItems.pharmacy],
        admin: [allItems.attendance],
      };
    case 'staff':
      return {
        main: [allItems.dashboard],
        clinical: [],
        inpatient: [],
        operations: [],
        admin: [allItems.attendance],
      };
    case 'patient':
      return {
        main: [allItems.dashboard, allItems.myAppointments, allItems.findDoctor],
        clinical: [allItems.myPrescriptions, allItems.myLabReports],
        inpatient: [],
        operations: [allItems.myBills],
        admin: [allItems.myProfile],
      };
    default:
      return {
        main: [],
        clinical: [],
        inpatient: [],
        operations: [],
        admin: [],
      };
  }
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = getNavItemsByRole(user?.role);

  const renderNavSection = (items: NavItem[], title?: string) => {
    if (items.length === 0) return null;
    return (
      <>
        {title && <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>}
        {items.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer font-medium text-sm",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover-elevate"
                )}
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:hidden bg-card border-b p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-primary text-xl">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Stethoscope className="w-5 h-5" />
          </div>
          MediCare HMS
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="button-mobile-menu">
          {mobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r shadow-sm transform transition-transform duration-200 ease-in-out md:translate-x-0 md:sticky md:top-0 md:h-screen flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white shadow-lg shadow-primary/25">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">MediCare</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Hospital Management</p>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-3 space-y-1">
            {renderNavSection(navItems.main)}
            {navItems.clinical.length > 0 && (
              <>
                <div className="py-2" />
                {renderNavSection(navItems.clinical, "Clinical")}
              </>
            )}
            {navItems.inpatient.length > 0 && (
              <>
                <div className="py-2" />
                {renderNavSection(navItems.inpatient, "Inpatient")}
              </>
            )}
            {navItems.operations.length > 0 && (
              <>
                <div className="py-2" />
                {renderNavSection(navItems.operations, "Operations")}
              </>
            )}
            {navItems.admin.length > 0 && (
              <>
                <div className="py-2" />
                {renderNavSection(navItems.admin, "My Account")}
              </>
            )}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t bg-muted/30 shrink-0">
          <Link href="/profile">
            <div 
              className={cn(
                "flex items-center gap-3 mb-3 px-2 py-2 rounded-lg cursor-pointer transition-colors",
                location === "/profile" ? "bg-primary/10" : "hover-elevate"
              )}
              data-testid="nav-profile"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="font-medium text-sm truncate">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || "Staff"}</p>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-muted/30">
        <div className="hidden md:flex items-center justify-end gap-3 p-3 border-b bg-card/50 backdrop-blur sticky top-0 z-30">
          <QuickActions />
          <NotificationCenter />
        </div>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
