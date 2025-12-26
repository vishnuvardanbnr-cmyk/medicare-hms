import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Plus, FileCheck, Clock, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePatients } from "@/hooks/use-patients";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { InsuranceProvider, InsuranceClaim, PreAuthorization } from "@shared/schema";

const providerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  type: z.string().min(1, "Type is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  cashlessEnabled: z.boolean().default(true),
});

const claimFormSchema = z.object({
  patientId: z.coerce.number().min(1, "Patient is required"),
  providerId: z.coerce.number().min(1, "Provider is required"),
  claimAmount: z.coerce.number().min(0, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  diagnosis: z.string().optional(),
});

export default function InsurancePage() {
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);

  const { data: providers, isLoading } = useQuery<InsuranceProvider[]>({
    queryKey: ["/api/insurance-providers"],
  });
  const { data: claims } = useQuery<InsuranceClaim[]>({
    queryKey: ["/api/insurance-claims"],
  });
  const { data: preAuths } = useQuery<PreAuthorization[]>({
    queryKey: ["/api/pre-authorizations"],
  });

  const getClaimStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': case 'settled': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Insurance Management
          </h1>
          <p className="text-muted-foreground">Manage insurance providers, claims, and pre-authorizations</p>
        </div>
        <div className="flex gap-2">
          <CreateClaimDialog providers={providers || []} open={claimDialogOpen} onOpenChange={setClaimDialogOpen} />
          <CreateProviderDialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Insurance Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{providers?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{claims?.filter(c => c.status === 'submitted').length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{claims?.filter(c => c.status === 'approved' || c.status === 'settled').length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pre-Authorizations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{preAuths?.filter(p => p.status === 'pending').length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="providers" className="w-full">
        <TabsList>
          <TabsTrigger value="providers" data-testid="tab-providers">Providers</TabsTrigger>
          <TabsTrigger value="claims" data-testid="tab-claims">Claims</TabsTrigger>
          <TabsTrigger value="preauth" data-testid="tab-preauth">Pre-Authorizations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="providers" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {providers && providers.length > 0 ? (
                <div className="space-y-3">
                  {providers.map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`row-provider-${provider.id}`}>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">{provider.code} - {provider.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {provider.cashlessEnabled && <Badge variant="default">Cashless</Badge>}
                        <Badge variant={provider.isActive ? "outline" : "secondary"}>
                          {provider.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4" />
                  <p>No insurance providers registered</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="claims" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {claims && claims.length > 0 ? (
                <div className="space-y-3">
                  {claims.map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`row-claim-${claim.id}`}>
                      <div className="flex items-center gap-3">
                        {getClaimStatusIcon(claim.status || 'pending')}
                        <div>
                          <p className="font-medium">Claim #{claim.id}</p>
                          <p className="text-sm text-muted-foreground">Patient #{claim.patientId} - ${claim.claimAmount}</p>
                        </div>
                      </div>
                      <Badge variant={claim.status === 'approved' ? "default" : "secondary"}>
                        {claim.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileCheck className="w-12 h-12 mx-auto mb-4" />
                  <p>No insurance claims</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preauth" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {preAuths && preAuths.length > 0 ? (
                <div className="space-y-3">
                  {preAuths.map((auth) => (
                    <div key={auth.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`row-preauth-${auth.id}`}>
                      <div>
                        <p className="font-medium">Pre-Auth #{auth.id}</p>
                        <p className="text-sm text-muted-foreground">Patient #{auth.patientId} - ${auth.approvedAmount || '0'}</p>
                      </div>
                      <Badge variant={auth.status === 'approved' ? "default" : "secondary"}>
                        {auth.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4" />
                  <p>No pre-authorizations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateProviderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof providerFormSchema>) => {
      return apiRequest("POST", "/api/insurance-providers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-providers"] });
      toast({ title: "Provider added", description: "The insurance provider has been successfully added." });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof providerFormSchema>>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      name: "",
      code: "",
      type: "",
      contactPerson: "",
      phone: "",
      email: "",
      cashlessEnabled: true,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-provider">
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Insurance Provider</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Blue Cross" {...field} data-testid="input-provider-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., BC001" {...field} data-testid="input-provider-code" />
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
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-provider-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Private">Private Insurance</SelectItem>
                      <SelectItem value="Government">Government Insurance</SelectItem>
                      <SelectItem value="Corporate">Corporate Insurance</SelectItem>
                      <SelectItem value="TPA">Third Party Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Smith" {...field} data-testid="input-contact-person" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., +1-555-0123" {...field} data-testid="input-provider-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cashlessEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-cashless" />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Cashless Facility Enabled</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-provider">
              {mutation.isPending ? "Adding..." : "Add Provider"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CreateClaimDialog({ providers, open, onOpenChange }: { providers: InsuranceProvider[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: patients } = usePatients();

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof claimFormSchema>) => {
      return apiRequest("POST", "/api/insurance-claims", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-claims"] });
      toast({ title: "Claim submitted", description: "The insurance claim has been submitted." });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof claimFormSchema>>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      claimAmount: 0,
      description: "",
      diagnosis: "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-new-claim">
          <FileCheck className="w-4 h-4 mr-2" />
          New Claim
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Insurance Claim</DialogTitle>
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
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Provider</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger data-testid="select-provider">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="claimAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Claim Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} data-testid="input-claim-amount" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter diagnosis" {...field} data-testid="input-diagnosis" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the claim..." {...field} data-testid="input-claim-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-claim">
              {mutation.isPending ? "Submitting..." : "Submit Claim"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
