import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, FileText, DollarSign, Clock, CheckCircle, Trash2, Stethoscope, Pill, TestTube } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { usePatients } from "@/hooks/use-patients";
import { useDoctors } from "@/hooks/use-doctors";
import type { Invoice, Patient, Doctor, LabReport, Prescription } from "@shared/schema";

const invoiceFormSchema = z.object({
  patientId: z.coerce.number().min(1, "Patient is required"),
  invoiceDate: z.string().min(1, "Date is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

type LineItem = {
  id: string;
  type: 'consultation' | 'lab' | 'medicine' | 'room' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  labReportId?: number;
  prescriptionId?: number;
};

export default function BillingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });
  const { data: pendingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices/pending"],
  });
  const { data: patients } = usePatients();

  const getPatientName = (patientId: number) => {
    const patient = patients?.find(p => p.id === patientId);
    return patient?.name || `Patient #${patientId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partially-paid': return 'secondary';
      case 'overdue': return 'destructive';
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

  const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0) || 0;
  const pendingAmount = pendingInvoices?.reduce((sum, inv) => sum + Number(inv.balanceAmount || inv.totalAmount), 0) || 0;
  const paidCount = invoices?.filter(inv => inv.status === 'paid').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Billing & Cashier
          </h1>
          <p className="text-muted-foreground">Manage invoices, payments, and billing</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-create-invoice">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" /> Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{invoices?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Revenue Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">${pendingAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Paid Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{paidCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.slice(0, 10).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg border" data-testid={`row-invoice-${invoice.id}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">{getPatientName(invoice.patientId)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">${invoice.totalAmount}</p>
                      {invoice.balanceAmount && Number(invoice.balanceAmount) > 0 && (
                        <p className="text-sm text-muted-foreground">Balance: ${invoice.balanceAmount}</p>
                      )}
                    </div>
                    <Badge variant={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No invoices yet</p>
              <p className="text-sm mt-1">Click "Create Invoice" to bill a patient</p>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateInvoiceDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        patients={patients || []}
      />
    </div>
  );
}

function CreateInvoiceDialog({ 
  open, 
  onOpenChange,
  patients
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
}) {
  const { toast } = useToast();
  const { data: doctors } = useDoctors();
  const { data: labReports } = useQuery<LabReport[]>({ queryKey: ["/api/lab-reports"] });
  const { data: prescriptions } = useQuery<Prescription[]>({ queryKey: ["/api/prescriptions"] });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [newItemType, setNewItemType] = useState<LineItem['type']>('consultation');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  const pendingLabTests = labReports?.filter(
    r => r.paymentStatus === 'pending_payment' && 
    (selectedPatientId ? r.patientId === selectedPatientId : true)
  ) || [];

  const unbilledPrescriptions = prescriptions?.filter(
    rx => (rx.paymentStatus === 'unbilled' || rx.paymentStatus === 'pending') && 
    !rx.isDispensed &&
    (selectedPatientId ? rx.patientId === selectedPatientId : true)
  ) || [];

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const addLineItem = () => {
    if (!newItemDesc || newItemPrice <= 0) {
      toast({ title: "Error", description: "Please fill in description and price", variant: "destructive" });
      return;
    }
    const item: LineItem = {
      id: Date.now().toString(),
      type: newItemType,
      description: newItemDesc,
      quantity: newItemQty,
      unitPrice: newItemPrice,
      total: newItemQty * newItemPrice,
    };
    setLineItems([...lineItems, item]);
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const addDoctorConsultation = (doctorId: string) => {
    const doctor = doctors?.find(d => d.id === Number(doctorId));
    if (doctor) {
      const item: LineItem = {
        id: Date.now().toString(),
        type: 'consultation',
        description: `Consultation - Dr. ${doctor.name} (${doctor.specialty})`,
        quantity: 1,
        unitPrice: Number(doctor.consultationFee) || 100,
        total: Number(doctor.consultationFee) || 100,
      };
      setLineItems([...lineItems, item]);
    }
  };

  const addLabTest = (labReportId: string) => {
    const labReport = labReports?.find(r => r.id === Number(labReportId));
    if (labReport) {
      const alreadyAdded = lineItems.some(item => item.labReportId === labReport.id);
      if (alreadyAdded) {
        toast({ title: "Already added", description: "This lab test is already in the invoice", variant: "destructive" });
        return;
      }
      const price = Number(labReport.testPrice) || 50;
      const item: LineItem = {
        id: Date.now().toString(),
        type: 'lab',
        description: `Lab Test - ${labReport.testName}`,
        quantity: 1,
        unitPrice: price,
        total: price,
        labReportId: labReport.id,
      };
      setLineItems([...lineItems, item]);
    }
  };

  const addPrescription = (prescriptionId: string) => {
    const rx = prescriptions?.find(p => p.id === Number(prescriptionId));
    if (rx) {
      const alreadyAdded = lineItems.some(item => item.prescriptionId === rx.id);
      if (alreadyAdded) {
        toast({ title: "Already added", description: "This prescription is already in the invoice", variant: "destructive" });
        return;
      }
      const price = Number(rx.medicationCost) || 50;
      const item: LineItem = {
        id: Date.now().toString(),
        type: 'medicine',
        description: `Prescription: ${rx.medications}`,
        quantity: 1,
        unitPrice: price,
        total: price,
        prescriptionId: rx.id,
      };
      setLineItems([...lineItems, item]);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceFormSchema>) => {
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
      const labReportIds = lineItems.filter(item => item.labReportId).map(item => item.labReportId);
      const prescriptionIds = lineItems.filter(item => item.prescriptionId).map(item => item.prescriptionId);
      return apiRequest("POST", "/api/invoices", {
        ...data,
        invoiceNumber,
        totalAmount: total.toFixed(2),
        taxAmount: tax.toFixed(2),
        discountAmount: "0.00",
        paidAmount: total.toFixed(2),
        balanceAmount: "0.00",
        status: "paid",
        items: lineItems,
        labReportIds,
        prescriptionIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      toast({ title: "Invoice created & paid", description: "The invoice has been created and marked as paid." });
      onOpenChange(false);
      form.reset();
      setLineItems([]);
      setSelectedPatientId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const getItemIcon = (type: LineItem['type']) => {
    switch (type) {
      case 'consultation': return <Stethoscope className="w-4 h-4" />;
      case 'lab': return <TestTube className="w-4 h-4" />;
      case 'medicine': return <Pill className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Create Invoice
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => {
            if (lineItems.length === 0) {
              toast({ title: "Error", description: "Please add at least one item", variant: "destructive" });
              return;
            }
            mutation.mutate(data);
          })} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSelectedPatientId(Number(val));
                      }} 
                      value={field.value?.toString()}
                    >
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

              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-invoice-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {pendingLabTests.length > 0 && (
              <div className="border rounded-lg p-4 space-y-4 border-amber-500/50 bg-amber-50/30 dark:bg-amber-900/10">
                <div className="flex items-center gap-2">
                  <TestTube className="w-4 h-4 text-amber-600" />
                  <h3 className="font-medium text-amber-700 dark:text-amber-400">Pending Lab Tests</h3>
                  <Badge variant="secondary" className="ml-auto">{pendingLabTests.length} awaiting payment</Badge>
                </div>
                <Select onValueChange={addLabTest}>
                  <SelectTrigger data-testid="select-lab-test">
                    <SelectValue placeholder="Select lab test to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingLabTests.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id.toString()}>
                        {lab.testName} - ${lab.testPrice || '50.00'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {unbilledPrescriptions.length > 0 && (
              <div className="border rounded-lg p-4 space-y-4 border-blue-500/50 bg-blue-50/30 dark:bg-blue-900/10">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium text-blue-700 dark:text-blue-400">Unbilled Prescriptions</h3>
                  <Badge variant="secondary" className="ml-auto">{unbilledPrescriptions.length} awaiting payment</Badge>
                </div>
                <Select onValueChange={addPrescription}>
                  <SelectTrigger data-testid="select-prescription">
                    <SelectValue placeholder="Select prescription to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {unbilledPrescriptions.map((rx) => (
                      <SelectItem key={rx.id} value={rx.id.toString()}>
                        {rx.medications} - ${rx.medicationCost || '50.00'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Quick Add Doctor Consultation</h3>
              </div>
              <Select onValueChange={addDoctorConsultation}>
                <SelectTrigger data-testid="select-quick-doctor">
                  <SelectValue placeholder="Select doctor to add consultation fee" />
                </SelectTrigger>
                <SelectContent>
                  {doctors?.filter(d => d.isActive).map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      Dr. {d.name} - {d.specialty} (${d.consultationFee})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Add Line Item</h3>
              <div className="grid grid-cols-5 gap-2">
                <Select value={newItemType} onValueChange={(v) => setNewItemType(v as LineItem['type'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="lab">Lab Test</SelectItem>
                    <SelectItem value="medicine">Medicine</SelectItem>
                    <SelectItem value="room">Room Charge</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  placeholder="Description" 
                  value={newItemDesc} 
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="col-span-2"
                />
                <Input 
                  type="number" 
                  placeholder="Price" 
                  value={newItemPrice || ''} 
                  onChange={(e) => setNewItemPrice(Number(e.target.value))}
                />
                <Button type="button" onClick={addLineItem} variant="secondary">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {lineItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Item</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Price</th>
                      <th className="text-right p-2">Total</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {getItemIcon(item.type)}
                            <span>{item.description}</span>
                          </div>
                        </td>
                        <td className="text-right p-2">{item.quantity}</td>
                        <td className="text-right p-2">${item.unitPrice.toFixed(2)}</td>
                        <td className="text-right p-2 font-medium">${item.total.toFixed(2)}</td>
                        <td className="p-2">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30">
                    <tr className="border-t">
                      <td colSpan={3} className="text-right p-2">Subtotal:</td>
                      <td className="text-right p-2 font-medium">${subtotal.toFixed(2)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="text-right p-2">Tax (5%):</td>
                      <td className="text-right p-2">${tax.toFixed(2)}</td>
                      <td></td>
                    </tr>
                    <tr className="border-t">
                      <td colSpan={3} className="text-right p-2 font-bold">Total:</td>
                      <td className="text-right p-2 font-bold text-lg">${total.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={mutation.isPending || lineItems.length === 0} 
              data-testid="button-submit-invoice"
            >
              {mutation.isPending ? "Creating..." : `Create Invoice ($${total.toFixed(2)})`}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
