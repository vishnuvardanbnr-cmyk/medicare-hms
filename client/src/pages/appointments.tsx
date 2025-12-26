import { useAppointments, useCreateAppointment, useUpdateAppointment } from "@/hooks/use-appointments";
import { useDoctors } from "@/hooks/use-doctors";
import { usePatients, useCreatePatient } from "@/hooks/use-patients";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, User, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, insertPatientSchema, type InsertAppointment, type InsertPatient } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { format, isToday, isTomorrow, isPast, isFuture } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Enhance schema for form to handle date string/object conversion
const appointmentFormSchema = insertAppointmentSchema.extend({
  patientId: z.coerce.number(),
  doctorId: z.coerce.number(),
  date: z.string().or(z.date()).transform(val => new Date(val)),
});

export default function AppointmentsPage() {
  const { data: appointments, isLoading } = useAppointments();
  const { data: doctors } = useDoctors();
  const { data: patients } = usePatients();
  const { user } = useAuth();
  const { mutate: updateStatus } = useUpdateAppointment();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("scheduled");

  // Find doctor record for current user if they are a doctor
  const myDoctorRecord = user?.role === 'doctor' 
    ? doctors?.find(d => (d as any).userId === user.id) 
    : null;

  // Filter appointments by doctor if user is a doctor
  const myAppointments = user?.role === 'doctor' && myDoctorRecord
    ? appointments?.filter(a => a.doctorId === myDoctorRecord.id)
    : appointments;

  // Sort by date, newest first
  const sortedAppointments = myAppointments?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Filter appointments based on active tab
  const scheduledAppointments = sortedAppointments?.filter(apt => apt.status === 'scheduled' || apt.status === 'confirmed' || apt.status === 'in-progress');
  const completedAppointments = sortedAppointments?.filter(apt => apt.status === 'completed');
  const cancelledAppointments = sortedAppointments?.filter(apt => apt.status === 'cancelled' || apt.status === 'no-show');

  const handleStatusChange = (id: number, status: string) => {
    updateStatus({ id, status: status as any }, {
      onSuccess: () => toast({ title: "Status Updated", description: `Appointment marked as ${status}` }),
    });
  };

  const getPatientName = (id: number) => patients?.find(p => p.id === id)?.name || "Unknown Patient";
  const getDoctorName = (id: number) => doctors?.find(d => d.id === id)?.name || "Unknown Doctor";

  const renderAppointmentsList = (appointmentsList: typeof sortedAppointments, emptyMessage: string) => {
    if (isLoading) {
      return [1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />);
    }
    
    if (!appointmentsList?.length) {
      return (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <h3 className="text-lg font-medium">{emptyMessage}</h3>
          <p className="text-muted-foreground">No appointments to display.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {appointmentsList.map((apt) => {
          const date = new Date(apt.date);
          const isUpcoming = isFuture(date) && apt.status === 'scheduled';
          
          return (
            <Card key={apt.id} className={cn(
              "border shadow-sm transition-all hover:shadow-md",
              isUpcoming ? "border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
            )}>
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center justify-center w-16 h-16 bg-muted/30 rounded-xl border shrink-0">
                    <span className="text-xs font-bold uppercase text-muted-foreground">{format(date, 'MMM')}</span>
                    <span className="text-2xl font-bold text-foreground">{format(date, 'd')}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {apt.queuePosition && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground" data-testid={`text-queue-${apt.id}`}>
                          Q{apt.queuePosition}
                        </span>
                      )}
                      <h3 className="font-bold text-lg">{getPatientName(apt.patientId)}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                        apt.status === 'scheduled' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" :
                        apt.status === 'completed' ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" :
                        "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                      )}>
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                      <User className="w-3 h-3" /> Dr. {getDoctorName(apt.doctorId)}
                      <span className="text-muted-foreground/50">|</span>
                      <Clock className="w-3 h-3" /> {format(date, 'h:mm a')}
                    </p>
                    <p className="text-sm mt-2 font-medium bg-muted/30 px-2 py-1 rounded inline-block">
                      {apt.reason}
                    </p>
                    {apt.chequeNumber && (
                      <p className="text-xs mt-1 text-muted-foreground">
                        Cheque: {apt.chequeNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {apt.status === 'scheduled' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-green-600 dark:text-green-400"
                        onClick={() => handleStatusChange(apt.id, 'completed')}
                        data-testid={`button-complete-${apt.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Complete
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 dark:text-red-400"
                        onClick={() => handleStatusChange(apt.id, 'cancelled')}
                        data-testid={`button-cancel-${apt.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Appointments</h2>
          <p className="text-muted-foreground mt-1">Schedule and manage patient visits.</p>
        </div>
        <BookAppointmentDialog open={isOpen} onOpenChange={setIsOpen} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">
            Scheduled ({scheduledAppointments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedAppointments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled">
            Cancelled ({cancelledAppointments?.length || 0})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="scheduled" className="mt-6">
          {renderAppointmentsList(scheduledAppointments, "No scheduled appointments")}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {renderAppointmentsList(completedAppointments, "No completed appointments")}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-6">
          {renderAppointmentsList(cancelledAppointments, "No cancelled appointments")}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookAppointmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate, isPending } = useCreateAppointment();
  const { mutate: createPatient, isPending: isCreatingPatient } = useCreatePatient();
  const { data: doctors } = useDoctors();
  const { data: patients } = usePatients();
  const { toast } = useToast();
  const [showQuickRegister, setShowQuickRegister] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: undefined,
      doctorId: undefined,
      date: "",
      reason: "",
      notes: "",
      status: "scheduled",
      chequeNumber: "",
    },
  });

  const quickRegisterForm = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      name: "",
      phone: "",
      gender: "male",
      dob: "",
      email: "",
      address: "",
    },
  });

  function onSubmit(data: any) {
    mutate(data, {
      onSuccess: () => {
        toast({ title: "Appointment Booked", description: "The appointment has been scheduled successfully." });
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => {
        toast({ title: "Booking Failed", description: error.message, variant: "destructive" });
      },
    });
  }

  function onQuickRegister(data: InsertPatient) {
    createPatient(data, {
      onSuccess: (newPatient: any) => {
        toast({ title: "Patient Registered", description: `${data.name} has been registered successfully.` });
        form.setValue("patientId", newPatient.id);
        setShowQuickRegister(false);
        quickRegisterForm.reset();
      },
      onError: (error) => {
        toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); setShowQuickRegister(false); }}>
      <DialogTrigger asChild>
        <Button className="shrink-0 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
          <Plus className="w-4 h-4 mr-2" />
          Book Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{showQuickRegister ? "Quick Patient Registration" : "Book New Appointment"}</DialogTitle>
        </DialogHeader>
        
        {showQuickRegister ? (
          <Form {...quickRegisterForm}>
            <form onSubmit={quickRegisterForm.handleSubmit(onQuickRegister)} className="space-y-4 pt-4">
              <FormField
                control={quickRegisterForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Patient name" {...field} className="rounded-xl" data-testid="input-quick-patient-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={quickRegisterForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} className="rounded-xl" data-testid="input-quick-patient-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={quickRegisterForm.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl" data-testid="select-quick-patient-gender">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={quickRegisterForm.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="rounded-xl" data-testid="input-quick-patient-dob" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowQuickRegister(false)}>Back</Button>
                <Button type="submit" disabled={isCreatingPatient} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25" data-testid="button-quick-register-submit">
                  {isCreatingPatient ? "Registering..." : "Register & Select"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl flex-1">
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowQuickRegister(true)}
                      title="Quick register new patient"
                      data-testid="button-quick-register"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doctor</FormLabel>
                  <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors?.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          Dr. {d.name} ({d.specialty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Visit</FormLabel>
                  <FormControl>
                    <Input placeholder="Checkup, Fever, etc." {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chequeNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cheque Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter cheque number if applicable" {...field} value={field.value || ''} className="rounded-xl" data-testid="input-cheque-number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
                {isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
