import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, User, Calendar, TestTube, Upload, Clock, CheckCircle, AlertCircle, Stethoscope, DollarSign, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePatients } from "@/hooks/use-patients";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { LabReport, Patient, Doctor } from "@shared/schema";

const TEST_PRICES: Record<string, number> = {
  "Complete Blood Count (CBC)": 25,
  "Blood Glucose Test": 15,
  "Lipid Panel": 45,
  "Liver Function Test (LFT)": 55,
  "Kidney Function Test (KFT)": 50,
  "Thyroid Function Test": 60,
  "Urinalysis": 20,
  "Chest X-Ray": 80,
  "ECG": 40,
  "MRI Scan": 500,
  "CT Scan": 350,
  "Ultrasound": 120,
};

const requestTestSchema = z.object({
  patientId: z.coerce.number().min(1, "Patient is required"),
  doctorId: z.coerce.number().min(1, "Doctor is required"),
  testName: z.string().min(1, "Test name is required"),
  testPrice: z.coerce.number().optional(),
  priority: z.enum(["routine", "urgent", "stat"]),
  clinicalNotes: z.string().optional(),
});

const uploadResultsSchema = z.object({
  results: z.string().min(1, "Results are required"),
  normalRange: z.string().optional(),
  interpretation: z.string().optional(),
  testDate: z.string().min(1, "Test date is required"),
});

export default function LabReportsPage() {
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);

  const { user } = useAuth();
  const { data: allLabReports, isLoading } = useQuery<LabReport[]>({
    queryKey: ["/api/lab-reports"],
  });
  const { data: patients } = usePatients();
  const { data: doctors } = useDoctors();

  // Find doctor record for current user if they are a doctor
  const myDoctorRecord = user?.role === 'doctor' 
    ? doctors?.find(d => (d as any).userId === user?.id) 
    : null;

  // Filter lab reports by doctor if user is a doctor
  const labReports = user?.role === 'doctor' && myDoctorRecord
    ? allLabReports?.filter(r => r.doctorId === myDoctorRecord.id)
    : allLabReports;

  const pendingReports = labReports?.filter(r => r.status === 'pending' || r.status === 'processing') || [];
  const completedReports = labReports?.filter(r => r.status === 'completed' || r.status === 'verified') || [];

  const getPatientName = (patientId: number) => {
    const patient = patients?.find(p => p.id === patientId);
    return patient?.name || `Patient #${patientId}`;
  };

  const getDoctorName = (doctorId: number | null) => {
    if (!doctorId) return "N/A";
    const doctor = doctors?.find(d => d.id === doctorId);
    return doctor?.name || `Doctor #${doctorId}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'verified': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed": case "verified": return "default";
      case "processing": return "secondary";
      default: return "outline";
    }
  };

  const getPriorityColor = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case "stat": return "destructive";
      case "urgent": return "secondary";
      default: return "outline";
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string | null) => {
    switch (paymentStatus) {
      case "paid":
        return <Badge variant="default" className="bg-green-600"><DollarSign className="w-3 h-3 mr-1" />Paid</Badge>;
      case "waived":
        return <Badge variant="secondary"><DollarSign className="w-3 h-3 mr-1" />Waived</Badge>;
      default:
        return <Badge variant="destructive"><CreditCard className="w-3 h-3 mr-1" />Awaiting Payment</Badge>;
    }
  };

  const handleUploadResults = (report: LabReport) => {
    setSelectedReport(report);
    setUploadDialogOpen(true);
  };

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
            <FileText className="w-6 h-6 text-primary" />
            Lab Reports
          </h1>
          <p className="text-muted-foreground">Request tests and manage lab results</p>
        </div>
        <RequestTestDialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendingReports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{completedReports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TestTube className="w-4 h-4" /> Total Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{labReports?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Requests ({pendingReports.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed Reports ({completedReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <div className="space-y-4">
            {pendingReports.length > 0 ? (
              pendingReports.map((report) => (
                <Card key={report.id} data-testid={`card-pending-${report.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(report.status)}
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TestTube className="w-4 h-4" />
                            {report.testName}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {report.priority && (
                          <Badge variant={getPriorityColor(report.priority)}>
                            {report.priority.toUpperCase()}
                          </Badge>
                        )}
                        {getPaymentStatusBadge(report.paymentStatus)}
                        <Badge variant={getStatusColor(report.status)}>
                          {report.status === 'pending' ? 'Awaiting Sample' : 'Processing'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-4 h-4" /> {getPatientName(report.patientId)}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Stethoscope className="w-4 h-4" /> Ordered by: {getDoctorName(report.doctorId)}
                      </span>
                    </div>
                    {report.clinicalNotes && (
                      <p className="text-sm bg-muted/50 p-2 rounded">
                        <strong>Clinical Notes:</strong> {report.clinicalNotes}
                      </p>
                    )}
                    {report.testPrice && Number(report.testPrice) > 0 && (
                      <p className="text-sm text-muted-foreground">
                        <DollarSign className="w-3 h-3 inline" /> Test Price: ${report.testPrice}
                      </p>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      {report.paymentStatus !== 'paid' && report.paymentStatus !== 'waived' && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Patient must pay at cashier before lab work
                        </p>
                      )}
                      <Button 
                        onClick={() => handleUploadResults(report)} 
                        disabled={report.paymentStatus !== 'paid' && report.paymentStatus !== 'waived'}
                        data-testid={`button-upload-${report.id}`}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Results
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending test requests</p>
                  <p className="text-sm text-muted-foreground mt-1">Doctors can request lab tests for patients</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <div className="space-y-4">
            {completedReports.length > 0 ? (
              completedReports.map((report) => (
                <Card key={report.id} data-testid={`card-completed-${report.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(report.status)}
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TestTube className="w-4 h-4" />
                            {report.testName}
                          </CardTitle>
                        </div>
                      </div>
                      <Badge variant="default">
                        {report.status === 'verified' ? 'Verified' : 'Completed'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <User className="w-4 h-4" /> {getPatientName(report.patientId)}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" /> {report.testDate}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Stethoscope className="w-4 h-4" /> {getDoctorName(report.doctorId)}
                      </span>
                    </div>
                    <div className="bg-muted/50 p-3 rounded space-y-2">
                      <p className="text-sm"><strong>Results:</strong> {report.results}</p>
                      {report.normalRange && (
                        <p className="text-sm text-muted-foreground">Normal Range: {report.normalRange}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No completed reports yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <UploadResultsDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen} 
        report={selectedReport}
      />
    </div>
  );
}

function RequestTestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: patients } = usePatients();
  const { data: doctors } = useDoctors();

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof requestTestSchema>) => {
      const testPrice = TEST_PRICES[data.testName] || 50;
      const payload = {
        ...data,
        testDate: new Date().toISOString().split("T")[0],
        results: "",
        normalRange: "",
        status: "pending",
        paymentStatus: "pending_payment",
        testPrice: testPrice.toString(),
      };
      return apiRequest("POST", "/api/lab-reports", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-reports"] });
      toast({ title: "Test requested", description: "The lab test request has been sent to the lab department." });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof requestTestSchema>>({
    resolver: zodResolver(requestTestSchema),
    defaultValues: {
      testName: "",
            priority: "routine",
      clinicalNotes: "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-request-test">
          <Plus className="w-4 h-4 mr-2" />
          Request Lab Test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Request Lab Test
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
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requesting Doctor</FormLabel>
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
            <FormField
              control={form.control}
              name="testName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Name</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-test-name">
                        <SelectValue placeholder="Select test" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</SelectItem>
                      <SelectItem value="Blood Glucose Test">Blood Glucose Test</SelectItem>
                      <SelectItem value="Lipid Panel">Lipid Panel</SelectItem>
                      <SelectItem value="Liver Function Test (LFT)">Liver Function Test (LFT)</SelectItem>
                      <SelectItem value="Kidney Function Test (KFT)">Kidney Function Test (KFT)</SelectItem>
                      <SelectItem value="Thyroid Function Test">Thyroid Function Test</SelectItem>
                      <SelectItem value="Urinalysis">Urinalysis</SelectItem>
                      <SelectItem value="Chest X-Ray">Chest X-Ray</SelectItem>
                      <SelectItem value="ECG">ECG</SelectItem>
                      <SelectItem value="MRI Scan">MRI Scan</SelectItem>
                      <SelectItem value="CT Scan">CT Scan</SelectItem>
                      <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
                        <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT (Immediate)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clinicalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Reason for test, symptoms, etc." {...field} data-testid="input-clinical-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-request">
              {mutation.isPending ? "Sending Request..." : "Send to Lab"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function UploadResultsDialog({ 
  open, 
  onOpenChange, 
  report 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  report: LabReport | null;
}) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof uploadResultsSchema>) => {
      if (!report) throw new Error("No report selected");
      return apiRequest("PATCH", `/api/lab-reports/${report.id}`, {
        ...data,
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-reports"] });
      toast({ title: "Results uploaded", description: "The test results have been uploaded and the doctor will be notified." });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof uploadResultsSchema>>({
    resolver: zodResolver(uploadResultsSchema),
    defaultValues: {
      results: "",
      normalRange: "",
      interpretation: "",
      testDate: new Date().toISOString().split("T")[0],
    },
  });

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Test Results
          </DialogTitle>
        </DialogHeader>
        <div className="bg-muted/50 p-3 rounded mb-4">
          <p className="font-medium">{report.testName}</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="testDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Completion Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-test-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="results"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Results</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter detailed test results..." 
                      className="min-h-[100px]"
                      {...field} 
                      data-testid="input-results" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="normalRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Normal Range</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 4.5-11.0 x10^9/L" {...field} data-testid="input-normal-range" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interpretation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interpretation (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Lab technician notes or interpretation..." 
                      {...field} 
                      data-testid="input-interpretation" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-upload-results">
              {mutation.isPending ? "Uploading..." : "Upload Results"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
