import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Plus, Building, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { Ward, Bed as BedType } from "@shared/schema";

const wardFormSchema = z.object({
  name: z.string().min(1, "Ward name is required"),
  code: z.string().min(1, "Ward code is required"),
  type: z.string().min(1, "Ward type is required"),
  floor: z.string().optional(),
  totalBeds: z.coerce.number().min(1, "Total beds must be at least 1"),
  occupiedBeds: z.coerce.number().optional(),
});

const bedFormSchema = z.object({
  wardId: z.coerce.number().min(1, "Ward is required"),
  bedNumber: z.string().min(1, "Bed number is required"),
  type: z.string().min(1, "Bed type is required"),
  dailyRate: z.coerce.number().optional(),
});

export default function WardsPage() {
  const [wardDialogOpen, setWardDialogOpen] = useState(false);
  const [expandedWards, setExpandedWards] = useState<number[]>([]);
  
  const { data: wards, isLoading: wardsLoading } = useQuery<Ward[]>({
    queryKey: ["/api/wards"],
  });

  const { data: allBeds } = useQuery<BedType[]>({
    queryKey: ["/api/beds"],
  });

  const toggleWard = (wardId: number) => {
    setExpandedWards(prev => 
      prev.includes(wardId) 
        ? prev.filter(id => id !== wardId)
        : [...prev, wardId]
    );
  };

  const getBedsByWard = (wardId: number) => {
    return allBeds?.filter(bed => bed.wardId === wardId) || [];
  };

  if (wardsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bed className="w-6 h-6 text-primary" />
            Wards & Beds
          </h1>
          <p className="text-muted-foreground">Manage hospital wards and bed occupancy</p>
        </div>
        <CreateWardDialog open={wardDialogOpen} onOpenChange={setWardDialogOpen} />
      </div>

      <div className="space-y-4">
        {wards && wards.length > 0 ? (
          wards.map((ward) => {
            const wardBeds = getBedsByWard(ward.id);
            const availableBeds = wardBeds.filter(b => b.status === 'available').length;
            const occupiedBeds = wardBeds.filter(b => b.status === 'occupied').length;
            const maintenanceBeds = wardBeds.filter(b => b.status === 'maintenance').length;
            const totalBedCount = wardBeds.length || ward.totalBeds;
            const occupancyRate = totalBedCount > 0 ? (occupiedBeds / totalBedCount) * 100 : 0;
            const isExpanded = expandedWards.includes(ward.id);
            
            return (
              <Card key={ward.id} data-testid={`card-ward-${ward.id}`}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleWard(ward.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover-elevate">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Building className="w-5 h-5 text-primary" />
                          <div>
                            <CardTitle className="text-lg">{ward.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {ward.floor && `Floor ${ward.floor}`} {ward.code && `| ${ward.code}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{ward.type}</Badge>
                          <div className="text-right">
                            <p className="text-sm font-medium">{wardBeds.length} beds</p>
                            <p className="text-xs text-muted-foreground">
                              {availableBeds} available
                            </p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                      <Progress value={occupancyRate} className="h-2 mt-3" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex gap-2">
                          <Badge variant="default">{availableBeds} Available</Badge>
                          <Badge variant="secondary">{occupiedBeds} Occupied</Badge>
                          {maintenanceBeds > 0 && (
                            <Badge variant="outline">{maintenanceBeds} Maintenance</Badge>
                          )}
                        </div>
                        <AddBedToWardButton ward={ward} />
                      </div>
                      
                      {wardBeds.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {wardBeds.map((bed) => (
                            <BedCard key={bed.id} bed={bed} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-muted/30 rounded-md">
                          <Bed className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No beds added yet</p>
                          <p className="text-xs text-muted-foreground">Click "Add Bed" to create beds in this ward</p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Bed className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No wards configured</p>
              <Button variant="outline" className="mt-4" onClick={() => setWardDialogOpen(true)} data-testid="button-create-first-ward">
                Create First Ward
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function BedCard({ bed }: { bed: BedType }) {
  const statusColors: Record<string, string> = {
    available: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
    occupied: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
    maintenance: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
    reserved: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  };

  const statusIcons: Record<string, string> = {
    available: "text-green-600 dark:text-green-400",
    occupied: "text-red-600 dark:text-red-400",
    maintenance: "text-yellow-600 dark:text-yellow-400",
    reserved: "text-blue-600 dark:text-blue-400",
  };

  const status = bed.status || 'available';
  
  return (
    <div 
      className={`p-3 rounded-md border text-center ${statusColors[status]}`}
      data-testid={`bed-${bed.id}`}
    >
      <Bed className={`w-5 h-5 mx-auto mb-1 ${statusIcons[status]}`} />
      <p className="font-medium text-sm">{bed.bedNumber}</p>
      <p className="text-xs text-muted-foreground capitalize">{status}</p>
    </div>
  );
}

function AddBedToWardButton({ ward }: { ward: Ward }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof bedFormSchema>) => {
      return apiRequest("POST", "/api/beds", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wards"] });
      toast({ title: "Bed created", description: "The bed has been added to the ward." });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof bedFormSchema>>({
    resolver: zodResolver(bedFormSchema),
    defaultValues: {
      wardId: ward.id,
      bedNumber: "",
      type: "Standard",
      dailyRate: 100,
    },
  });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} data-testid={`button-add-bed-${ward.id}`}>
        <Plus className="w-4 h-4 mr-1" />
        Add Bed
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Bed to {ward.name}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="bedNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bed Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., B-101" {...field} data-testid="input-bed-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bed Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-bed-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="ICU">ICU</SelectItem>
                        <SelectItem value="Semi-Private">Semi-Private</SelectItem>
                        <SelectItem value="Private">Private</SelectItem>
                        <SelectItem value="Deluxe">Deluxe</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dailyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Rate</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-daily-rate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-bed">
                {mutation.isPending ? "Adding..." : "Add Bed"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateWardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof wardFormSchema>) => {
      return apiRequest("POST", "/api/wards", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wards"] });
      toast({ title: "Ward created", description: "The ward has been successfully created." });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof wardFormSchema>>({
    resolver: zodResolver(wardFormSchema),
    defaultValues: {
      name: "",
      code: `W${Date.now().toString(36).toUpperCase()}`,
      type: "",
      floor: "1",
      totalBeds: 10,
      occupiedBeds: 0,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button onClick={() => onOpenChange(true)} data-testid="button-add-ward">
        <Plus className="w-4 h-4 mr-2" />
        Add Ward
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Ward</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ward Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., General Ward A" {...field} data-testid="input-ward-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ward Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-ward-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="ICU">ICU</SelectItem>
                      <SelectItem value="Pediatric">Pediatric</SelectItem>
                      <SelectItem value="Maternity">Maternity</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="Surgery">Surgery</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="floor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} data-testid="input-ward-floor" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalBeds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Beds</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} data-testid="input-total-beds" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-ward">
              {mutation.isPending ? "Creating..." : "Create Ward"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
