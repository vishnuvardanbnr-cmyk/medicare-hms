import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/dashboard";
import DoctorsPage from "@/pages/doctors";
import PatientsPage from "@/pages/patients";
import AppointmentsPage from "@/pages/appointments";
import DepartmentsPage from "@/pages/departments";
import PrescriptionsPage from "@/pages/prescriptions";
import LabReportsPage from "@/pages/lab-reports";
import VitalsPage from "@/pages/vitals";
import WardsPage from "@/pages/wards";
import AdmissionsPage from "@/pages/admissions";
import PharmacyPage from "@/pages/pharmacy";
import InsurancePage from "@/pages/insurance";
import AmbulancePage from "@/pages/ambulance";
import BillingPage from "@/pages/billing";
import StaffPage from "@/pages/staff";
import ReportsPage from "@/pages/reports";
import ProfilePage from "@/pages/profile";
import AttendancePage from "@/pages/attendance";
import MyAppointmentsPage from "@/pages/my-appointments";
import MyPrescriptionsPage from "@/pages/my-prescriptions";
import MyLabReportsPage from "@/pages/my-lab-reports";
import MyBillsPage from "@/pages/my-bills";
import MyProfilePage from "@/pages/my-profile";
import FindDoctorPage from "@/pages/find-doctor";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Layout><Component /></Layout>;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/">{user ? <PrivateRoute component={Dashboard} /> : <LoginPage />}</Route>
      <Route path="/doctors">{user ? <PrivateRoute component={DoctorsPage} /> : <LoginPage />}</Route>
      <Route path="/patients">{user ? <PrivateRoute component={PatientsPage} /> : <LoginPage />}</Route>
      <Route path="/appointments">{user ? <PrivateRoute component={AppointmentsPage} /> : <LoginPage />}</Route>
      <Route path="/departments">{user ? <PrivateRoute component={DepartmentsPage} /> : <LoginPage />}</Route>
      <Route path="/prescriptions">{user ? <PrivateRoute component={PrescriptionsPage} /> : <LoginPage />}</Route>
      <Route path="/lab-reports">{user ? <PrivateRoute component={LabReportsPage} /> : <LoginPage />}</Route>
      <Route path="/vitals">{user ? <PrivateRoute component={VitalsPage} /> : <LoginPage />}</Route>
      <Route path="/wards">{user ? <PrivateRoute component={WardsPage} /> : <LoginPage />}</Route>
      <Route path="/admissions">{user ? <PrivateRoute component={AdmissionsPage} /> : <LoginPage />}</Route>
      <Route path="/pharmacy">{user ? <PrivateRoute component={PharmacyPage} /> : <LoginPage />}</Route>
      <Route path="/insurance">{user ? <PrivateRoute component={InsurancePage} /> : <LoginPage />}</Route>
      <Route path="/ambulance">{user ? <PrivateRoute component={AmbulancePage} /> : <LoginPage />}</Route>
      <Route path="/billing">{user ? <PrivateRoute component={BillingPage} /> : <LoginPage />}</Route>
      <Route path="/staff">{user ? <PrivateRoute component={StaffPage} /> : <LoginPage />}</Route>
      <Route path="/reports">{user ? <PrivateRoute component={ReportsPage} /> : <LoginPage />}</Route>
      <Route path="/profile">{user ? <PrivateRoute component={ProfilePage} /> : <LoginPage />}</Route>
      <Route path="/attendance">{user ? <PrivateRoute component={AttendancePage} /> : <LoginPage />}</Route>
      <Route path="/my-appointments">{user ? <PrivateRoute component={MyAppointmentsPage} /> : <LoginPage />}</Route>
      <Route path="/my-prescriptions">{user ? <PrivateRoute component={MyPrescriptionsPage} /> : <LoginPage />}</Route>
      <Route path="/my-lab-reports">{user ? <PrivateRoute component={MyLabReportsPage} /> : <LoginPage />}</Route>
      <Route path="/my-bills">{user ? <PrivateRoute component={MyBillsPage} /> : <LoginPage />}</Route>
      <Route path="/my-profile">{user ? <PrivateRoute component={MyProfilePage} /> : <LoginPage />}</Route>
      <Route path="/find-doctor">{user ? <PrivateRoute component={FindDoctorPage} /> : <LoginPage />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
