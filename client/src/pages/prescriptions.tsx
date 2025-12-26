import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Pill, User, Calendar, Check, X, Package, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePatients } from "@/hooks/use-patients";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useMemo, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Prescription, Medicine } from "@shared/schema";

type MedicineItem = {
  name: string;
  medicineId?: number;
  inStock: boolean;
  quantity?: number;
  dosage: string;
  frequency: string;
  duration: string;
  timeOfDay: string;
  foodTiming: string;
};

const medicineFormSchema = z.object({
  name: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  timeOfDay: z.string().min(1, "Time of day is required"),
  foodTiming: z.string().min(1, "Food timing is required"),
});

const prescriptionFormSchema = z.object({
  patientId: z.coerce.number().min(1, "Patient is required"),
  doctorId: z.coerce.number().min(1, "Doctor is required"),
});

export default function PrescriptionsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { data: doctors } = useDoctors();
  const { data: allPrescriptions, isLoading } = useQuery<Prescription[]>({
    queryKey: ["/api/prescriptions"],
  });

  // Find doctor record for current user if they are a doctor
  const myDoctorRecord = user?.role === 'doctor' 
    ? doctors?.find(d => (d as any).userId === user?.id) 
    : null;

  // Filter prescriptions by doctor if user is a doctor
  const prescriptions = user?.role === 'doctor' && myDoctorRecord
    ? allPrescriptions?.filter(p => p.doctorId === myDoctorRecord.id)
    : allPrescriptions;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Prescriptions
          </h1>
          <p className="text-muted-foreground">Manage patient prescriptions</p>
        </div>
        <CreatePrescriptionDialog open={isOpen} onOpenChange={setIsOpen} />
      </div>

      <div className="grid gap-4">
        {prescriptions && prescriptions.length > 0 ? (
          prescriptions.map((prescription) => (
            <Card key={prescription.id} data-testid={`card-prescription-${prescription.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    {prescription.prescriptionUid}
                  </CardTitle>
                  <Badge variant={prescription.isDispensed ? "default" : "secondary"}>
                    {prescription.isDispensed ? "Dispensed" : "Pending Pharmacy"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-4 h-4" /> Patient #{prescription.patientId}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(prescription.createdAt || '').toLocaleDateString()}</span>
                </div>
                <p className="text-sm"><strong>Medications:</strong> {prescription.medications}</p>
                <p className="text-sm"><strong>Dosage:</strong> {prescription.dosage} - {prescription.frequency} for {prescription.duration}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No prescriptions found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CreatePrescriptionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: patients } = usePatients();
  const { data: doctors } = useDoctors();
  const { data: medicines } = useQuery<Medicine[]>({ queryKey: ["/api/medicines"] });
  
  const [savedMedicines, setSavedMedicines] = useState<MedicineItem[]>([]);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<{ name: string; id?: number; inStock: boolean; quantity?: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredMedicines = useMemo(() => {
    if (medicineSearch.length < 3) return [];
    return medicines?.filter(m => 
      m.name.toLowerCase().includes(medicineSearch.toLowerCase()) ||
      m.genericName?.toLowerCase().includes(medicineSearch.toLowerCase())
    ).slice(0, 8) || [];
  }, [medicines, medicineSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof prescriptionFormSchema>) => {
      if (savedMedicines.length === 0) {
        throw new Error("Please add at least one medicine");
      }
      const medicationsText = savedMedicines.map(m => m.name).join(", ");
      const dosageText = savedMedicines.map(m => `${m.name}: ${m.dosage}`).join("; ");
      const frequencyText = savedMedicines.map(m => `${m.name}: ${m.frequency}`).join("; ");
      const durationText = savedMedicines.map(m => `${m.name}: ${m.duration}`).join("; ");
      
      const payload = {
        patientId: data.patientId,
        doctorId: data.doctorId,
        medications: medicationsText,
        dosage: dosageText,
        frequency: frequencyText,
        duration: durationText,
        notes: "",
      };
      return apiRequest("POST", "/api/prescriptions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      toast({ title: "Prescription created", description: "The prescription has been sent to Pharmacy for dispensing." });
      onOpenChange(false);
      prescriptionForm.reset();
      setSavedMedicines([]);
      medicineForm.reset();
      setSelectedMedicine(null);
      setMedicineSearch("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const prescriptionForm = useForm<z.infer<typeof prescriptionFormSchema>>({
    resolver: zodResolver(prescriptionFormSchema),
  });

  const medicineForm = useForm<z.infer<typeof medicineFormSchema>>({
    resolver: zodResolver(medicineFormSchema),
    defaultValues: {
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      timeOfDay: "",
      foodTiming: "",
    },
  });

  const handleSelectMedicine = (medicine: Medicine) => {
    const inStock = (medicine.quantity || 0) > 0;
    setSelectedMedicine({
      name: medicine.name,
      id: medicine.id,
      inStock,
      quantity: medicine.quantity || 0,
    });
    medicineForm.setValue("name", medicine.name);
    setMedicineSearch(medicine.name);
    setShowSuggestions(false);
  };

  const handleSaveMedicine = (data: z.infer<typeof medicineFormSchema>) => {
    const newMedicine: MedicineItem = {
      ...data,
      medicineId: selectedMedicine?.id,
      inStock: selectedMedicine?.inStock ?? true,
      quantity: selectedMedicine?.quantity,
    };
    setSavedMedicines(prev => [...prev, newMedicine]);
    medicineForm.reset();
    setSelectedMedicine(null);
    setMedicineSearch("");
    toast({ title: "Medicine added", description: `${data.name} has been added to the prescription.` });
  };

  const removeMedicine = (index: number) => {
    setSavedMedicines(prev => prev.filter((_, i) => i !== index));
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSavedMedicines([]);
      medicineForm.reset();
      prescriptionForm.reset();
      setSelectedMedicine(null);
      setMedicineSearch("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-prescription">
          <Plus className="w-4 h-4 mr-2" />
          New Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Prescription</DialogTitle>
        </DialogHeader>
        
        <Form {...prescriptionForm}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={prescriptionForm.control}
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
                        {patients?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={prescriptionForm.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescribed By (Doctor)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-doctor">
                          <SelectValue placeholder="Select doctor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctors?.map((d) => (
                          <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {savedMedicines.length > 0 && (
              <div className="space-y-2">
                <FormLabel className="text-base font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Saved Medicines ({savedMedicines.length})
                </FormLabel>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-2 pr-4">
                    {savedMedicines.map((medicine, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-md border"
                        data-testid={`saved-medicine-${index}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate flex items-center gap-2">
                            <Pill className="w-3 h-3 text-primary flex-shrink-0" />
                            {medicine.name}
                            {medicine.medicineId && (
                              medicine.inStock ? (
                                <Badge variant="outline" className="text-xs ml-1">
                                  <Package className="w-3 h-3 mr-1" /> {medicine.quantity} in stock
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs ml-1">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Out of Stock
                                </Badge>
                              )
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {medicine.dosage} | {medicine.frequency} | {medicine.duration} | {medicine.timeOfDay}, {medicine.foodTiming}
                          </p>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="flex-shrink-0"
                          onClick={() => removeMedicine(index)}
                          data-testid={`button-remove-medicine-${index}`}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Medicine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...medicineForm}>
                  <form onSubmit={medicineForm.handleSubmit(handleSaveMedicine)} className="space-y-3">
                    <FormField
                      control={medicineForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Medicine Name</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                ref={inputRef}
                                placeholder="Type 3+ letters to search pharmacy..." 
                                value={medicineSearch}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setMedicineSearch(value);
                                  field.onChange(value);
                                  setSelectedMedicine(null);
                                  if (value.length >= 3) {
                                    setShowSuggestions(true);
                                  } else {
                                    setShowSuggestions(false);
                                  }
                                }}
                                onFocus={() => {
                                  if (medicineSearch.length >= 3) {
                                    setShowSuggestions(true);
                                  }
                                }}
                                data-testid="input-medicine-name" 
                              />
                            </FormControl>
                            {showSuggestions && medicineSearch.length >= 3 && (
                              <div 
                                ref={suggestionsRef}
                                className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-y-auto"
                              >
                                {filteredMedicines.length === 0 ? (
                                  <div className="p-3 text-sm text-muted-foreground text-center">
                                    No medicines found. You can still type the medicine name manually.
                                  </div>
                                ) : (
                                  <div className="py-1">
                                    <div className="px-3 py-1 text-xs text-muted-foreground font-medium">
                                      Pharmacy Inventory
                                    </div>
                                    {filteredMedicines.map((medicine) => (
                                      <div
                                        key={medicine.id}
                                        className="px-3 py-2 cursor-pointer hover:bg-muted flex items-center justify-between gap-2"
                                        onClick={() => handleSelectMedicine(medicine)}
                                        data-testid={`medicine-option-${medicine.id}`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Pill className="w-4 h-4 flex-shrink-0" />
                                          <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">{medicine.name}</p>
                                            {medicine.genericName && (
                                              <p className="text-xs text-muted-foreground truncate">{medicine.genericName}</p>
                                            )}
                                          </div>
                                        </div>
                                        {(medicine.quantity || 0) > 0 ? (
                                          <Badge variant="outline" className="text-xs flex-shrink-0">
                                            <Package className="w-3 h-3 mr-1" />
                                            {medicine.quantity}
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive" className="text-xs flex-shrink-0">
                                            Out of stock
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {selectedMedicine && (
                            <p className="text-xs text-green-600 mt-1">
                              Selected: {selectedMedicine.name} 
                              {selectedMedicine.inStock 
                                ? ` (${selectedMedicine.quantity} in stock)`
                                : " (Out of stock)"}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={medicineForm.control}
                        name="dosage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Dosage</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-dosage">
                                  <SelectValue placeholder="Select dosage" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1 tablet">1 tablet</SelectItem>
                                <SelectItem value="2 tablets">2 tablets</SelectItem>
                                <SelectItem value="1/2 tablet">1/2 tablet</SelectItem>
                                <SelectItem value="5ml">5ml</SelectItem>
                                <SelectItem value="10ml">10ml</SelectItem>
                                <SelectItem value="1 capsule">1 capsule</SelectItem>
                                <SelectItem value="2 capsules">2 capsules</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={medicineForm.control}
                        name="frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Frequency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-frequency">
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Once daily">Once daily</SelectItem>
                                <SelectItem value="Twice daily">Twice daily</SelectItem>
                                <SelectItem value="Three times daily">Three times daily</SelectItem>
                                <SelectItem value="Four times daily">Four times daily</SelectItem>
                                <SelectItem value="Every 4 hours">Every 4 hours</SelectItem>
                                <SelectItem value="Every 6 hours">Every 6 hours</SelectItem>
                                <SelectItem value="Every 8 hours">Every 8 hours</SelectItem>
                                <SelectItem value="As needed">As needed (PRN)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={medicineForm.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Duration</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-duration">
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="3 days">3 days</SelectItem>
                                <SelectItem value="5 days">5 days</SelectItem>
                                <SelectItem value="7 days">7 days</SelectItem>
                                <SelectItem value="10 days">10 days</SelectItem>
                                <SelectItem value="14 days">14 days</SelectItem>
                                <SelectItem value="21 days">21 days</SelectItem>
                                <SelectItem value="30 days">30 days</SelectItem>
                                <SelectItem value="Continuous">Continuous</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={medicineForm.control}
                        name="timeOfDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Time of Day</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-time-of-day">
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Morning">Morning</SelectItem>
                                <SelectItem value="Afternoon">Afternoon</SelectItem>
                                <SelectItem value="Evening">Evening</SelectItem>
                                <SelectItem value="Night">Night</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <FormField
                        control={medicineForm.control}
                        name="foodTiming"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Food Timing</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-food-timing">
                                  <SelectValue placeholder="Select food timing" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Before food">Before food</SelectItem>
                                <SelectItem value="After food">After food</SelectItem>
                                <SelectItem value="30 min before food">30 min before food</SelectItem>
                                <SelectItem value="30 min after food">30 min after food</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" variant="secondary" className="w-full" data-testid="button-save-medicine">
                      <Check className="w-4 h-4 mr-2" />
                      Save Medicine
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Button 
              type="button"
              onClick={prescriptionForm.handleSubmit((data) => mutation.mutate(data))}
              className="w-full" 
              disabled={mutation.isPending || savedMedicines.length === 0} 
              data-testid="button-submit-prescription"
            >
              {mutation.isPending ? "Creating..." : `Create Prescription (${savedMedicines.length} medicine${savedMedicines.length !== 1 ? 's' : ''})`}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
