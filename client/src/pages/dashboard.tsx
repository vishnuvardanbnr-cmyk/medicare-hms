import { useStats } from "@/hooks/use-stats";
import { useAppointments } from "@/hooks/use-appointments";
import { useDoctors } from "@/hooks/use-doctors";
import { useWards } from "@/hooks/use-wards";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { Bed as BedType } from "@shared/schema";
import { 
  Users, 
  Stethoscope, 
  CalendarCheck, 
  Activity, 
  Clock, 
  UserCheck, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Bed,
  AlertCircle,
  CheckCircle2,
  Timer,
  Heart,
  Pill,
  FileText,
  DollarSign,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: appointments, isLoading: apptsLoading } = useAppointments();
  const { data: doctors } = useDoctors();
  const { data: wards } = useWards();
  const { data: allBeds } = useQuery<BedType[]>({ queryKey: ["/api/beds"] });
  const { data: users } = useQuery<{ id: number; name: string; role: string }[]>({ queryKey: ["/api/users"] });
  const { user } = useAuth();
  const { toast } = useToast();

  const getNurseName = (nurseId: number | null) => {
    if (!nurseId) return "Not Assigned";
    const nurse = users?.find(u => u.id === nurseId);
    return nurse?.name || `Nurse #${nurseId}`;
  };

  const getDutyDoctor = (departmentId: number | null) => {
    if (!departmentId) return null;
    const doctor = doctors?.find(d => d.departmentId === departmentId && d.isActive);
    return doctor;
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (statsLoading || apptsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = stats?.appointmentsByDepartment?.length 
    ? stats.appointmentsByDepartment 
    : [{ name: "General", count: 1 }];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Weekly trend data
  const weeklyTrend = [
    { day: 'Mon', patients: 45, appointments: 32 },
    { day: 'Tue', patients: 52, appointments: 38 },
    { day: 'Wed', patients: 48, appointments: 35 },
    { day: 'Thu', patients: 61, appointments: 42 },
    { day: 'Fri', patients: 55, appointments: 40 },
    { day: 'Sat', patients: 30, appointments: 22 },
    { day: 'Sun', patients: 18, appointments: 12 },
  ];

  // Hourly patient flow
  const hourlyFlow = [
    { hour: '8AM', count: 12 },
    { hour: '9AM', count: 28 },
    { hour: '10AM', count: 45 },
    { hour: '11AM', count: 38 },
    { hour: '12PM', count: 22 },
    { hour: '1PM', count: 15 },
    { hour: '2PM', count: 35 },
    { hour: '3PM', count: 42 },
    { hour: '4PM', count: 30 },
    { hour: '5PM', count: 18 },
  ];

  // Bed occupancy data from actual beds
  const getBedsByWard = (wardId: number) => allBeds?.filter(b => b.wardId === wardId) || [];
  
  const bedOccupancyData = wards?.length 
    ? wards.filter(w => w.isActive).map(ward => {
        const wardBeds = getBedsByWard(ward.id);
        const total = wardBeds.length || ward.totalBeds;
        const occupied = wardBeds.filter(b => b.status === 'occupied').length;
        return {
          name: ward.name,
          total,
          occupied,
          available: wardBeds.filter(b => b.status === 'available' || !b.status).length,
          percentage: total > 0 ? Math.round((occupied / total) * 100) : 0
        };
      })
    : [];

  const totalBeds = allBeds?.length || bedOccupancyData.reduce((acc, w) => acc + w.total, 0);
  const occupiedBeds = allBeds?.filter(b => b.status === 'occupied').length || 0;
  const availableBeds = allBeds?.filter(b => b.status === 'available' || !b.status).length || 0;
  const bedOccupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Get today's appointments for the list
  const today = new Date().toISOString().split('T')[0];
  
  // Find doctor record for current user if they are a doctor
  const myDoctorRecord = user?.role === 'doctor' 
    ? doctors?.find(d => (d as any).userId === user?.id) 
    : null;

  // Filter appointments by doctor if user is a doctor
  const allTodaysAppointments = appointments?.filter(a => 
    new Date(a.date).toISOString().startsWith(today)
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

  // For doctors, filter to only their appointments
  const todaysAppointments = user?.role === 'doctor' && myDoctorRecord
    ? allTodaysAppointments.filter(a => a.doctorId === myDoctorRecord.id)
    : allTodaysAppointments;

  // Get all of doctor's patients (patients they've ever seen)
  const myPatientIds = user?.role === 'doctor' && myDoctorRecord
    ? new Set(appointments?.filter(a => a.doctorId === myDoctorRecord.id).map(a => a.patientId) || [])
    : null;
  const myTotalPatients = myPatientIds?.size || 0;

  // OP Token Queue
  const scheduledAppointments = todaysAppointments.filter(a => a.status === 'scheduled');
  const inProgressAppointments = todaysAppointments.filter(a => a.status === 'in_progress');
  const completedToday = todaysAppointments.filter(a => a.status === 'completed').length;

  // Get doctor name helper
  const getDoctorName = (doctorId: number | null) => {
    if (!doctorId) return "Unassigned";
    const doctor = doctors?.find(d => d.id === doctorId);
    return doctor?.name || `Doctor ${doctorId}`;
  };

  // Group appointments by doctor for queue
  const appointmentsWithDoctors = scheduledAppointments.filter(a => a.doctorId != null);
  const queueByDoctor = appointmentsWithDoctors.reduce((acc, apt) => {
    const docId = apt.doctorId!;
    if (!acc[docId]) acc[docId] = [];
    acc[docId].push(apt);
    return acc;
  }, {} as Record<number, typeof scheduledAppointments>);

  // Handle calling next token
  const callNextToken = async (appointmentId: number) => {
    try {
      await apiRequest("PATCH", `/api/appointments/${appointmentId}`, { status: "in_progress" });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({ title: "Token Called", description: "Patient has been called" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const completeAppointment = async (appointmentId: number) => {
    try {
      await apiRequest("PATCH", `/api/appointments/${appointmentId}`, { status: "completed" });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({ title: "Completed", description: "Appointment marked as completed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Get role-specific subtitle
  const getRoleSubtitle = () => {
    switch (user?.role) {
      case 'doctor': return "Your patients and appointments for today";
      case 'nurse': return "Ward status and patient care overview";
      case 'receptionist': return "Patient registration and appointments";
      case 'cashier': return "Billing and payment collection";
      case 'pharmacist': return "Prescription dispensing and inventory";
      default: return "Here's what's happening at your hospital today";
    }
  };

  // Get role-specific quick stats
  const getQuickStats = () => {
    switch (user?.role) {
      case 'doctor':
        const docRecord = doctors?.find(d => (d as any).userId === user?.id);
        const myAppointments = docRecord 
          ? todaysAppointments.filter(a => a.doctorId === docRecord.id)
          : [];
        return [
          { label: "My Patients Today", value: myAppointments.length, color: "text-blue-600" },
          { label: "Pending", value: myAppointments.filter(a => a.status === 'scheduled').length, color: "text-amber-600" },
          { label: "Completed", value: myAppointments.filter(a => a.status === 'completed').length, color: "text-green-600" },
        ];
      case 'nurse':
        return [
          { label: "Total Beds", value: totalBeds, color: "text-blue-600" },
          { label: "Occupied", value: occupiedBeds, color: "text-amber-600" },
          { label: "Available", value: availableBeds, color: "text-green-600" },
        ];
      case 'pharmacist':
        return [
          { label: "Pending Rx", value: completedToday, color: "text-amber-600" },
          { label: "In Queue", value: scheduledAppointments.length, color: "text-blue-600" },
          { label: "Active", value: inProgressAppointments.length, color: "text-green-600" },
        ];
      case 'receptionist':
        return [
          { label: "Today's Visits", value: allTodaysAppointments.length, color: "text-blue-600" },
          { label: "In Queue", value: scheduledAppointments.length, color: "text-amber-600" },
          { label: "Completed", value: completedToday, color: "text-green-600" },
        ];
      case 'cashier':
        return [
          { label: "Ready to Bill", value: completedToday, color: "text-blue-600" },
          { label: "In Progress", value: inProgressAppointments.length, color: "text-amber-600" },
          { label: "In Queue", value: scheduledAppointments.length, color: "text-green-600" },
        ];
      default:
        return [
          { label: "Pending", value: scheduledAppointments.length, color: "text-amber-600" },
          { label: "In Progress", value: inProgressAppointments.length, color: "text-blue-600" },
          { label: "Completed", value: completedToday, color: "text-green-600" },
        ];
    }
  };

  const quickStats = getQuickStats();

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-8"
    >
      {/* Header Section */}
      <motion.div variants={item} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {getRoleSubtitle()}
          </p>
        </div>
        <div className="flex items-center gap-6">
          {quickStats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main Stats Grid - Role-specific */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {user?.role === 'doctor' ? (
          <>
            {/* Doctor-specific stats */}
            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">My Patients</p>
                      <p className="text-4xl font-bold mt-2">{myTotalPatients}</p>
                      <div className="flex items-center gap-1 mt-2 text-blue-100 text-xs">
                        <Users className="w-3 h-3" />
                        <span>Total patients seen</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Users className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm font-medium">Today's Appointments</p>
                      <p className="text-4xl font-bold mt-2">{todaysAppointments.length}</p>
                      <div className="flex items-center gap-1 mt-2 text-violet-100 text-xs">
                        <Timer className="w-3 h-3" />
                        <span>{scheduledAppointments.length} pending</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CalendarCheck className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Completed Today</p>
                      <p className="text-4xl font-bold mt-2">{completedToday}</p>
                      <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Consultations done</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm font-medium">In Progress</p>
                      <p className="text-4xl font-bold mt-2">{inProgressAppointments.length}</p>
                      <div className="flex items-center gap-1 mt-2 text-amber-100 text-xs">
                        <Activity className="w-3 h-3" />
                        <span>Currently serving</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Activity className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>
          </>
        ) : user?.role === 'nurse' ? (
          <>
            {/* Nurse-specific stats */}
            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Beds</p>
                      <p className="text-4xl font-bold mt-2">{totalBeds}</p>
                      <div className="flex items-center gap-1 mt-2 text-blue-100 text-xs">
                        <Bed className="w-3 h-3" />
                        <span>Hospital-wide</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Bed className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Available Beds</p>
                      <p className="text-4xl font-bold mt-2">{availableBeds}</p>
                      <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready for admission</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm font-medium">Occupied Beds</p>
                      <p className="text-4xl font-bold mt-2">{occupiedBeds}</p>
                      <div className="flex items-center gap-1 mt-2 text-violet-100 text-xs">
                        <Users className="w-3 h-3" />
                        <span>Patients admitted</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Users className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm font-medium">Occupancy Rate</p>
                      <p className="text-4xl font-bold mt-2">{bedOccupancyPercent}%</p>
                      <div className="flex items-center gap-1 mt-2 text-amber-100 text-xs">
                        <Activity className="w-3 h-3" />
                        <span>Ward capacity</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Activity className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>
          </>
        ) : user?.role === 'receptionist' ? (
          <>
            {/* Receptionist-specific stats */}
            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Today's Appointments</p>
                      <p className="text-4xl font-bold mt-2">{allTodaysAppointments.length}</p>
                      <div className="flex items-center gap-1 mt-2 text-blue-100 text-xs">
                        <CalendarCheck className="w-3 h-3" />
                        <span>Scheduled visits</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CalendarCheck className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">In Queue</p>
                      <p className="text-4xl font-bold mt-2">{scheduledAppointments.length}</p>
                      <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>Waiting patients</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Clock className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm font-medium">Being Served</p>
                      <p className="text-4xl font-bold mt-2">{inProgressAppointments.length}</p>
                      <div className="flex items-center gap-1 mt-2 text-violet-100 text-xs">
                        <Activity className="w-3 h-3" />
                        <span>With doctors now</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Activity className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm font-medium">Completed Today</p>
                      <p className="text-4xl font-bold mt-2">{completedToday}</p>
                      <div className="flex items-center gap-1 mt-2 text-amber-100 text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Consultations done</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>
          </>
        ) : user?.role === 'cashier' ? (
          <>
            {/* Cashier-specific stats */}
            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Completed Today</p>
                      <p className="text-4xl font-bold mt-2">{completedToday}</p>
                      <div className="flex items-center gap-1 mt-2 text-blue-100 text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready for billing</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <DollarSign className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Total Patients</p>
                      <p className="text-4xl font-bold mt-2">{stats?.totalPatients || 0}</p>
                      <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs">
                        <Users className="w-3 h-3" />
                        <span>Registered patients</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Users className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm font-medium">In Progress</p>
                      <p className="text-4xl font-bold mt-2">{inProgressAppointments.length}</p>
                      <div className="flex items-center gap-1 mt-2 text-violet-100 text-xs">
                        <Activity className="w-3 h-3" />
                        <span>Consultations ongoing</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Activity className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm font-medium">Pending Queue</p>
                      <p className="text-4xl font-bold mt-2">{scheduledAppointments.length}</p>
                      <div className="flex items-center gap-1 mt-2 text-amber-100 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>Awaiting service</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Clock className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>
          </>
        ) : user?.role === 'pharmacist' ? (
          <>
            {/* Pharmacist-specific stats */}
            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Completed Consults</p>
                      <p className="text-4xl font-bold mt-2">{completedToday}</p>
                      <div className="flex items-center gap-1 mt-2 text-blue-100 text-xs">
                        <Pill className="w-3 h-3" />
                        <span>Prescriptions pending</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Pill className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">In Queue</p>
                      <p className="text-4xl font-bold mt-2">{scheduledAppointments.length}</p>
                      <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>Awaiting consult</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Clock className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm font-medium">Being Served</p>
                      <p className="text-4xl font-bold mt-2">{inProgressAppointments.length}</p>
                      <div className="flex items-center gap-1 mt-2 text-violet-100 text-xs">
                        <Activity className="w-3 h-3" />
                        <span>With doctors</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Activity className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm font-medium">Active Doctors</p>
                      <p className="text-4xl font-bold mt-2">{stats?.activeDoctors || 0}</p>
                      <div className="flex items-center gap-1 mt-2 text-amber-100 text-xs">
                        <Stethoscope className="w-3 h-3" />
                        <span>Prescribing today</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Stethoscope className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>
          </>
        ) : (
          <>
            {/* Admin/Staff stats */}
            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Patients</p>
                      <p className="text-4xl font-bold mt-2">{stats?.totalPatients || 0}</p>
                      <div className="flex items-center gap-1 mt-2 text-blue-100 text-xs">
                        <TrendingUp className="w-3 h-3" />
                        <span>+12% from last month</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Users className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Active Doctors</p>
                      <p className="text-4xl font-bold mt-2">{stats?.activeDoctors || 0}</p>
                      <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>All departments covered</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Stethoscope className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm font-medium">Today's Appointments</p>
                      <p className="text-4xl font-bold mt-2">{stats?.appointmentsToday || 0}</p>
                      <div className="flex items-center gap-1 mt-2 text-violet-100 text-xs">
                        <Timer className="w-3 h-3" />
                        <span>{scheduledAppointments.length} pending</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CalendarCheck className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm font-medium">Bed Occupancy</p>
                      <p className="text-4xl font-bold mt-2">{bedOccupancyPercent}%</p>
                      <div className="flex items-center gap-1 mt-2 text-amber-100 text-xs">
                        <Bed className="w-3 h-3" />
                        <span>{availableBeds} available / {totalBeds} beds</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Bed className="w-7 h-7" />
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              </Card>
            </motion.div>
          </>
        )}
      </div>

      {/* OP Token Queue Section */}
      <motion.div variants={item}>
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">OP Token Queue</CardTitle>
                <p className="text-sm text-muted-foreground">Real-time patient queue management</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Queue: <strong className="text-foreground">{scheduledAppointments.length}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Active: <strong className="text-foreground">{inProgressAppointments.length}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Done: <strong className="text-foreground">{completedToday}</strong></span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {inProgressAppointments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Currently Being Served
                </h4>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {inProgressAppointments.map((apt) => (
                    <div key={apt.id} className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-600/30">
                            {String(apt.id).padStart(3, '0')}
                          </div>
                          <div>
                            <p className="font-semibold">Token #{String(apt.id).padStart(3, '0')}</p>
                            <p className="text-xs text-muted-foreground">{getDoctorName(apt.doctorId)}</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => completeAppointment(apt.id)}
                          data-testid={`button-complete-${apt.id}`}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Done
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {Object.keys(queueByDoctor).length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Waiting Queue by Doctor
                </h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(queueByDoctor).map(([doctorId, aptsUnknown]) => {
                    const apts = aptsUnknown as typeof scheduledAppointments;
                    return (
                      <div key={doctorId} className="p-4 bg-muted/30 rounded-xl border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getDoctorName(Number(doctorId)).split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-sm">{getDoctorName(Number(doctorId))}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">{apts.length} waiting</Badge>
                        </div>
                        <div className="space-y-2">
                          {apts.slice(0, 3).map((apt: typeof scheduledAppointments[0], idx: number) => (
                            <div key={apt.id} className="flex items-center justify-between p-2 bg-background rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                                  idx === 0 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-muted text-muted-foreground"
                                )}>
                                  {String(apt.id).padStart(3, '0')}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(apt.date), 'h:mm a')}
                                </span>
                              </div>
                              {idx === 0 && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => callNextToken(apt.id)}
                                  data-testid={`button-call-token-${apt.id}`}
                                  className="h-7 text-xs"
                                >
                                  <ArrowRight className="w-3 h-3 mr-1" />
                                  Call
                                </Button>
                              )}
                            </div>
                          ))}
                          {apts.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center pt-1">
                              +{apts.length - 3} more in queue
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Clock className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-sm">No patients waiting in queue</p>
                <p className="text-xs mt-1">New patients will appear here when scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Patient Flow Chart */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border shadow-sm h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Weekly Overview</CardTitle>
                    <p className="text-sm text-muted-foreground">Patient visits and appointments</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyTrend}>
                    <defs>
                      <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area type="monotone" dataKey="patients" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPatients)" />
                    <Area type="monotone" dataKey="appointments" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAppointments)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-muted-foreground">Patients</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-muted-foreground">Appointments</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Department Distribution */}
        <motion.div variants={item}>
          <Card className="border shadow-sm h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Department Activity</CardTitle>
                  <p className="text-sm text-muted-foreground">Appointment distribution</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      fill="#8884d8"
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {chartData.map((entry: { name: string; count: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {chartData.slice(0, 4).map((entry: { name: string; count: number }, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <motion.div variants={item}>
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CalendarCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Today's Schedule</CardTitle>
                    <p className="text-sm text-muted-foreground">Upcoming appointments</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {todaysAppointments.length} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {todaysAppointments.slice(0, 5).length > 0 ? (
                <div className="space-y-3">
                  {todaysAppointments.slice(0, 5).map((apt, idx) => (
                    <div key={apt.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {String(apt.patientId).padStart(2, '0')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Patient #{apt.patientId}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {format(new Date(apt.date), 'h:mm a')} - {apt.reason || 'General checkup'}
                        </p>
                      </div>
                      <Badge 
                        variant={apt.status === 'completed' ? 'default' : apt.status === 'in_progress' ? 'secondary' : 'outline'}
                        className={cn(
                          "text-xs",
                          apt.status === 'completed' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                          apt.status === 'in_progress' && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        )}
                      >
                        {apt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <CalendarCheck className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-sm">No appointments for today</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Ward Duty Staff & Beds */}
        <motion.div variants={item}>
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Bed className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Wards & Duty Staff</CardTitle>
                    <p className="text-sm text-muted-foreground">Bed availability & assigned staff</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {availableBeds} beds available
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wards?.filter(w => w.isActive).slice(0, 4).map((ward, idx) => {
                  const wardBeds = allBeds?.filter(b => b.wardId === ward.id) || [];
                  const total = wardBeds.length || ward.totalBeds;
                  const occupied = wardBeds.filter(b => b.status === 'occupied').length;
                  const available = wardBeds.filter(b => b.status === 'available' || !b.status).length;
                  const percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;
                  const dutyDoctor = getDutyDoctor(ward.departmentId);
                  
                  return (
                    <div key={ward.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{ward.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">{ward.type}</Badge>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{available}/{total}</span>
                          <span className="text-xs text-muted-foreground ml-1">beds</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: idx * 0.1 }}
                          className={cn(
                            "h-full rounded-full",
                            percentage > 80 ? "bg-red-500" : 
                            percentage > 60 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" />
                          <span>{dutyDoctor?.name || "No Doctor Assigned"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{getNurseName(ward.nurseInCharge)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!wards || wards.filter(w => w.isActive).length === 0) && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Bed className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No wards configured yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
