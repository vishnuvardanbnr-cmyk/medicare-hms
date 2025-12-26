import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Stethoscope, Plus, User } from "lucide-react";
import { format, isToday, isFuture, isPast } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Appointment, Doctor, Patient } from "@shared/schema";

export default function MyAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [reason, setReason] = useState("");

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/patient/appointments'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const bookAppointment = useMutation({
    mutationFn: async (data: { doctorId: number; date: string; reason: string }) => {
      return apiRequest("POST", "/api/patient/appointments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patient/appointments'] });
      toast({ title: "Success", description: "Appointment booked successfully!" });
      setOpen(false);
      setSelectedDoctor("");
      setSelectedDate("");
      setReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to book appointment", variant: "destructive" });
    },
  });

  const cancelAppointment = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/patient/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patient/appointments'] });
      toast({ title: "Cancelled", description: "Appointment cancelled successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel appointment", variant: "destructive" });
    },
  });

  const upcomingAppointments = appointments.filter(a => 
    (a.status === 'scheduled' || a.status === 'in_progress') && 
    (isToday(new Date(a.date)) || isFuture(new Date(a.date)))
  );
  
  const pastAppointments = appointments.filter(a => 
    a.status === 'completed' || isPast(new Date(a.date))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <Badge variant="secondary">Scheduled</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case 'completed': return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleBookAppointment = () => {
    if (!selectedDoctor || !selectedDate) {
      toast({ title: "Error", description: "Please select a doctor and date", variant: "destructive" });
      return;
    }
    bookAppointment.mutate({
      doctorId: parseInt(selectedDoctor),
      date: selectedDate,
      reason,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
          <p className="text-muted-foreground">View and manage your appointments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-book-appointment">
              <Plus className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book New Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select Doctor</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger data-testid="select-doctor">
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.filter(d => d.isActive).map(doctor => (
                      <SelectItem key={doctor.id} value={doctor.id.toString()}>
                        Dr. {doctor.name} - {doctor.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preferred Date</Label>
                <input
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  data-testid="input-appointment-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason for Visit</Label>
                <Textarea
                  placeholder="Describe your symptoms or reason for visit..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  data-testid="input-appointment-reason"
                />
              </div>
              <Button 
                onClick={handleBookAppointment} 
                className="w-full"
                disabled={bookAppointment.isPending}
                data-testid="button-confirm-booking"
              >
                {bookAppointment.isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming appointments</p>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map(apt => {
                  const doctor = doctors.find(d => d.id === apt.doctorId);
                  return (
                    <div key={apt.id} className="p-4 border rounded-lg space-y-2" data-testid={`appointment-card-${apt.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">Dr. {doctor?.name || 'Unknown'}</span>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(apt.date), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {apt.timeSlot || 'TBD'}
                        </div>
                      </div>
                      {apt.status === 'scheduled' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => cancelAppointment.mutate(apt.id)}
                          data-testid={`button-cancel-${apt.id}`}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Past Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pastAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No past appointments</p>
            ) : (
              <div className="space-y-4">
                {pastAppointments.slice(0, 5).map(apt => {
                  const doctor = doctors.find(d => d.id === apt.doctorId);
                  return (
                    <div key={apt.id} className="p-4 border rounded-lg space-y-2" data-testid={`past-appointment-${apt.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">Dr. {doctor?.name || 'Unknown'}</span>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(apt.date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
