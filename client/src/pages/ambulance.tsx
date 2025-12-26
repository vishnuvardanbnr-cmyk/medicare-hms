import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ambulance as AmbulanceIcon, Plus, MapPin, Phone, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { Ambulance, AmbulanceBooking } from "@shared/schema";

const ambulanceFormSchema = z.object({
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  vehicleType: z.string().min(1, "Vehicle type is required"),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  status: z.enum(["available", "on-duty", "maintenance"]),
});

const bookingFormSchema = z.object({
  ambulanceId: z.coerce.number().min(1, "Ambulance is required"),
  patientName: z.string().min(1, "Patient name is required"),
  patientPhone: z.string().min(1, "Phone is required"),
  pickupLocation: z.string().min(1, "Pickup location is required"),
  destination: z.string().min(1, "Destination is required"),
  emergencyType: z.string().optional(),
  notes: z.string().optional(),
});

export default function AmbulancePage() {
  const [ambulanceDialogOpen, setAmbulanceDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const { data: ambulances, isLoading } = useQuery<Ambulance[]>({
    queryKey: ["/api/ambulances"],
  });
  const { data: bookings } = useQuery<AmbulanceBooking[]>({
    queryKey: ["/api/ambulance-bookings"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'on-duty': return 'destructive';
      case 'maintenance': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const availableCount = ambulances?.filter(a => a.status === 'available').length || 0;
  const onDutyCount = ambulances?.filter(a => a.status === 'on-duty').length || 0;
  const activeBookings = bookings?.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AmbulanceIcon className="w-6 h-6 text-primary" />
            Ambulance Services
          </h1>
          <p className="text-muted-foreground">Manage ambulance fleet and bookings</p>
        </div>
        <div className="flex gap-2">
          <CreateBookingDialog ambulances={ambulances || []} open={bookingDialogOpen} onOpenChange={setBookingDialogOpen} />
          <CreateAmbulanceDialog open={ambulanceDialogOpen} onOpenChange={setAmbulanceDialogOpen} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fleet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{ambulances?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{availableCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">On Duty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{onDutyCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeBookings}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fleet" className="w-full">
        <TabsList>
          <TabsTrigger value="fleet" data-testid="tab-fleet">Fleet</TabsTrigger>
          <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fleet" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ambulances && ambulances.length > 0 ? (
              ambulances.map((ambulance) => (
                <Card key={ambulance.id} data-testid={`card-ambulance-${ambulance.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AmbulanceIcon className="w-4 h-4" />
                        {ambulance.vehicleNumber}
                      </CardTitle>
                      <Badge variant={getStatusColor(ambulance.status || 'available')}>
                        {ambulance.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Type:</strong> {ambulance.vehicleType}</p>
                    {ambulance.driverName && <p><strong>Driver:</strong> {ambulance.driverName}</p>}
                    {ambulance.driverPhone && (
                      <p className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {ambulance.driverPhone}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="py-12 text-center">
                  <AmbulanceIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No ambulances in the fleet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="bookings" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {bookings && bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="p-4 rounded-lg border" data-testid={`row-booking-${booking.id}`}>
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <span className="font-medium">{booking.patientName}</span>
                        <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {booking.pickupLocation}</p>
                        <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> {booking.requestedTime ? new Date(booking.requestedTime).toLocaleString() : 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Phone className="w-12 h-12 mx-auto mb-4" />
                  <p>No bookings yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateAmbulanceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof ambulanceFormSchema>) => {
      return apiRequest("POST", "/api/ambulances", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ambulances"] });
      toast({ title: "Ambulance added", description: "The ambulance has been successfully added." });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof ambulanceFormSchema>>({
    resolver: zodResolver(ambulanceFormSchema),
    defaultValues: {
      vehicleNumber: "",
      vehicleType: "",
      driverName: "",
      driverPhone: "",
      status: "available",
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-ambulance">
          <Plus className="w-4 h-4 mr-2" />
          Add Ambulance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Ambulance</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicleNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AMB-001" {...field} data-testid="input-vehicle-number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-vehicle-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Basic">Basic Life Support</SelectItem>
                      <SelectItem value="Advanced">Advanced Life Support</SelectItem>
                      <SelectItem value="ICU">Mobile ICU</SelectItem>
                      <SelectItem value="Neonatal">Neonatal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="driverName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Smith" {...field} data-testid="input-driver-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="driverPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., +1-555-0123" {...field} data-testid="input-driver-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="on-duty">On Duty</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-ambulance">
              {mutation.isPending ? "Adding..." : "Add Ambulance"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CreateBookingDialog({ ambulances, open, onOpenChange }: { ambulances: Ambulance[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const availableAmbulances = ambulances.filter(a => a.status === 'available');

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingFormSchema>) => {
      return apiRequest("POST", "/api/ambulance-bookings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ambulance-bookings"] });
      toast({ title: "Booking created", description: "The ambulance booking has been created." });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      patientName: "",
      patientPhone: "",
      pickupLocation: "",
      destination: "",
      emergencyType: "",
      notes: "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-new-booking">
          <Phone className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Ambulance Booking</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="ambulanceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ambulance</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger data-testid="select-ambulance">
                        <SelectValue placeholder="Select ambulance" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableAmbulances.map((a) => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.vehicleNumber} - {a.vehicleType}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter patient name" {...field} data-testid="input-patient-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="patientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., +1-555-0123" {...field} data-testid="input-patient-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pickupLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Location</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter pickup address" {...field} data-testid="input-pickup-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., City Hospital" {...field} data-testid="input-destination" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-emergency-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Medical">Medical Emergency</SelectItem>
                      <SelectItem value="Accident">Accident</SelectItem>
                      <SelectItem value="Transfer">Patient Transfer</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-booking">
              {mutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
