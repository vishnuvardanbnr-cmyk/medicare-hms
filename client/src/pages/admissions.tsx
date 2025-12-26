import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, Bed, Calendar, UserPlus, Stethoscope } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { usePatients } from "@/hooks/use-patients";
import { useDoctors } from "@/hooks/use-doctors";
import { useWards } from "@/hooks/use-wards";
import type { WardAssignment, Bed as BedType, Patient, Ward, Doctor } from "@shared/schema";

const admissionFormSchema = z.object({
  patientId: z.coerce.number().min(1, "Patient is required"),
  wardId: z.coerce.number().min(1, "Ward is required"),
  bedId: z.coerce.number().optional(),
  bedNumber: z.string().min(1, "Bed number is required"),
  admissionDate: z.string().min(1, "Admission date is required"),
  expectedDischargeDate: z.string().optional(),
  admissionReason: z.string().min(1, "Admission reason is required"),
  attendingDoctorId: z.coerce.number().optional(),
});

export default function AdmissionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { data: admissions, isLoading } = useQuery<WardAssignment[]>({
    queryKey: ["/api/ward-assignments/active"],
  });
  
  const { data: patients } = usePatients();
  const { data: wards } = useWards();
  const { data: doctors } = useDoctors();

  const getPatientName = (patientId: number) => {
    const patient = patients?.find(p => p.id === patientId);
    return patient?.name || `Patient #${patientId}`;
  };

  const getWardName = (wardId: number) => {
    const ward = wards?.find(w => w.id === wardId);
    return ward?.name || `Ward #${wardId}`;
  };

  const getDoctorName = (doctorId: number | null) => {
    if (!doctorId) return "Not Assigned";
    const doctor = doctors?.find(d => d.id === doctorId);
    return doctor?.name || `Doctor #${doctorId}`;
  };

  const todayAdmissions = admissions?.filter(a => {
    const admDate = new Date(a.admissionDate).toDateString();
    return admDate === new Date().toDateString();
  }).length || 0;

  const pendingDischarges = admissions?.filter(a => {
    if (!a.expectedDischargeDate) return false;
    return new Date(a.expectedDischargeDate) <= new Date();
  }).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Admissions
          </h1>
          <p className="text-muted-foreground">Manage patient admissions and discharges</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-admission">
          <UserPlus className="w-4 h-4 mr-2" />
          New Admission
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Admissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{admissions?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Admissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayAdmissions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Discharges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingDischarges}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Admissions</CardTitle>
        </CardHeader>
        <CardContent>
          {admissions && admissions.length > 0 ? (
            <div className="space-y-4">
              {admissions.map((admission) => (
                <div key={admission.id} className="flex items-center justify-between p-4 rounded-lg border" data-testid={`row-admission-${admission.id}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{getPatientName(admission.patientId)}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3 h-3" /> {getWardName(admission.wardId)} - Bed {admission.bedNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" /> {getDoctorName(admission.attendingDoctorId ?? null)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(admission.admissionDate).toLocaleDateString()}
                        </span>
                      </div>
                      {admission.admissionReason && (
                        <p className="text-xs text-muted-foreground mt-1">Reason: {admission.admissionReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={admission.status === "active" ? "default" : "secondary"}>
                      {admission.status}
                    </Badge>
                    <Button variant="outline" size="sm">Discharge</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active admissions</p>
              <p className="text-sm mt-1">Click "New Admission" to admit a patient</p>
            </div>
          )}
        </CardContent>
      </Card>

      <NewAdmissionDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        patients={patients || []}
        wards={wards || []}
        doctors={doctors || []}
      />
    </div>
  );
}

function NewAdmissionDialog({ 
  open, 
  onOpenChange,
  patients,
  wards,
  doctors
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  wards: Ward[];
  doctors: Doctor[];
}) {
  const { toast } = useToast();
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);

  const { data: allBeds } = useQuery<BedType[]>({
    queryKey: ["/api/beds"],
  });

  const availableBeds = allBeds?.filter(
    b => b.wardId === selectedWardId && (b.status === 'available' || !b.status)
  ) || [];

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof admissionFormSchema>) => {
      return apiRequest("POST", "/api/ward-assignments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ward-assignments/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
      toast({ title: "Patient admitted", description: "The patient has been successfully admitted." });
      onOpenChange(false);
      form.reset();
      setSelectedWardId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof admissionFormSchema>>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      admissionDate: new Date().toISOString().split("T")[0],
      admissionReason: "",
      bedNumber: "",
    },
  });

  const handleWardChange = (wardId: string) => {
    setSelectedWardId(Number(wardId));
    form.setValue("wardId", Number(wardId));
    form.setValue("bedNumber", "");
    form.setValue("bedId", undefined);
  };

  const handleBedSelect = (bedId: string) => {
    const bed = allBeds?.find(b => b.id === Number(bedId));
    if (bed) {
      form.setValue("bedId", bed.id);
      form.setValue("bedNumber", bed.bedNumber);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            New Patient Admission
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger data-testid="select-patient">
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="wardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ward</FormLabel>
                    <Select onValueChange={handleWardChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-ward">
                          <SelectValue placeholder="Select ward" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {wards.filter(w => w.isActive).map((w) => (
                          <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Available Bed</FormLabel>
                <Select 
                  onValueChange={handleBedSelect} 
                  disabled={!selectedWardId || availableBeds.length === 0}
                >
                  <SelectTrigger data-testid="select-bed">
                    <SelectValue placeholder={
                      !selectedWardId 
                        ? "Select ward first" 
                        : availableBeds.length === 0 
                          ? "No beds available" 
                          : "Select bed"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBeds.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        Bed {b.bedNumber} ({b.bedType || 'Standard'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            </div>

            <FormField
              control={form.control}
              name="bedNumber"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attendingDoctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attending Doctor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger data-testid="select-doctor">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.filter(d => d.isActive).map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.name} - {d.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="admissionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-admission-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expectedDischargeDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Discharge</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-discharge-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="admissionReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Admission</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Surgery recovery, Observation, Treatment..." 
                      {...field} 
                      data-testid="input-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-admission">
              {mutation.isPending ? "Admitting..." : "Admit Patient"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
