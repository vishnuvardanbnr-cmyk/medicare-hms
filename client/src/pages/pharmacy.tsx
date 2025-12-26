import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pill, Plus, Package, AlertTriangle, ShoppingCart, Truck, Upload, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useRef } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import type { Medicine, Supplier, PurchaseOrder, Prescription, Patient, Doctor } from "@shared/schema";

const medicineFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  genericName: z.string().min(1, "Generic name is required"),
  code: z.string().min(1, "Code is required"),
  categoryId: z.coerce.number().optional(),
  formId: z.coerce.number().optional(),
  supplierId: z.coerce.number().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantity must be positive"),
  reorderLevel: z.coerce.number().optional(),
  purchasePrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().min(0, "Selling price must be positive"),
});

const supplierFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export default function PharmacyPage() {
  const [medicineDialogOpen, setMedicineDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const { toast } = useToast();
  const medicineFileRef = useRef<HTMLInputElement>(null);
  const supplierFileRef = useRef<HTMLInputElement>(null);

  const { data: medicines, isLoading: loadingMedicines } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });
  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });
  const { data: orders } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });
  const { data: lowStock } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines/low-stock"],
  });
  const { data: prescriptions } = useQuery<Prescription[]>({
    queryKey: ["/api/prescriptions"],
  });
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });
  const { data: doctors } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
  });
  const [prescriptionFilter, setPrescriptionFilter] = useState<string>("all");
  
  const dispensePrescription = useMutation({
    mutationFn: async ({ id, dispensedBy }: { id: number; dispensedBy: number }) => {
      return apiRequest("PUT", `/api/prescriptions/${id}`, { 
        isDispensed: true, 
        dispensedBy, 
        dispensedAt: new Date().toISOString() 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
      toast({ title: "Success", description: "Prescription dispensed successfully" });
    },
  });

  const getPatientName = (id: number) => patients?.find(p => p.id === id)?.name || "Unknown";
  const getDoctorName = (id: number) => doctors?.find(d => d.id === id)?.name || "Unknown";
  
  const filteredPrescriptions = prescriptions?.filter(p => {
    if (prescriptionFilter === "all") return true;
    if (prescriptionFilter === "paid") return p.paymentStatus === "paid";
    if (prescriptionFilter === "unpaid") return p.paymentStatus === "unbilled" || p.paymentStatus === "pending";
    if (prescriptionFilter === "dispensed") return p.isDispensed;
    if (prescriptionFilter === "pending") return !p.isDispensed;
    return true;
  });

  const handleMedicineExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
      
      let successCount = 0;
      const failedRows: string[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = String(row.name || row.Name || "");
        const sellingPrice = Number(row.sellingPrice || row["Selling Price"] || row.price || row.Price || 0);
        
        if (!name || sellingPrice <= 0) {
          failedRows.push(`Row ${i + 2}: Missing name or selling price`);
          continue;
        }
        
        try {
          await apiRequest("POST", "/api/medicines", {
            name,
            genericName: String(row.genericName || row["Generic Name"] || name),
            code: String(row.code || row.Code || row.SKU || `MED${Date.now()}_${i}`),
            quantity: Number(row.quantity || row.Quantity || 0),
            unitPrice: String(row.unitPrice || row["Unit Price"] || row.purchasePrice || row["Purchase Price"] || 0),
            sellingPrice: String(sellingPrice),
            expiryDate: row.expiryDate || row["Expiry Date"] || undefined,
            batchNumber: String(row.batchNumber || row["Batch Number"] || ""),
            reorderLevel: Number(row.reorderLevel || row["Reorder Level"] || 10),
          });
          successCount++;
        } catch {
          failedRows.push(`Row ${i + 2}: Server error`);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({ 
        title: "Import Complete", 
        description: `Imported ${successCount} of ${rows.length} medicines.${failedRows.length > 0 ? ` ${failedRows.length} failed.` : ""}` 
      });
    } catch {
      toast({ title: "Error", description: "Failed to parse Excel file", variant: "destructive" });
    }
    event.target.value = "";
  };

  const handleSupplierExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
      
      let successCount = 0;
      const failedRows: string[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = String(row.name || row.Name || "");
        const phone = String(row.phone || row.Phone || "");
        
        if (!name) {
          failedRows.push(`Row ${i + 2}: Missing name`);
          continue;
        }
        
        try {
          await apiRequest("POST", "/api/suppliers", {
            name,
            code: String(row.code || row.Code || `SUP${Date.now()}_${i}`),
            type: String(row.type || row.Type || "medicine"),
            contactPerson: String(row.contactPerson || row["Contact Person"] || ""),
            phone: phone || "N/A",
            email: String(row.email || row.Email || ""),
            address: String(row.address || row.Address || ""),
          });
          successCount++;
        } catch {
          failedRows.push(`Row ${i + 2}: Server error`);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ 
        title: "Import Complete", 
        description: `Imported ${successCount} of ${rows.length} suppliers.${failedRows.length > 0 ? ` ${failedRows.length} failed.` : ""}` 
      });
    } catch {
      toast({ title: "Error", description: "Failed to parse Excel file", variant: "destructive" });
    }
    event.target.value = "";
  };

  if (loadingMedicines) {
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
            <Pill className="w-6 h-6 text-primary" />
            Pharmacy
          </h1>
          <p className="text-muted-foreground">Manage medicines, suppliers, and inventory</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="file"
            ref={supplierFileRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleSupplierExcelUpload}
            className="hidden"
            data-testid="input-supplier-excel"
          />
          <Button variant="outline" onClick={() => supplierFileRef.current?.click()} data-testid="button-upload-suppliers">
            <Upload className="w-4 h-4 mr-2" />
            Import Suppliers
          </Button>
          <CreateSupplierDialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen} />
          <input
            type="file"
            ref={medicineFileRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleMedicineExcelUpload}
            className="hidden"
            data-testid="input-medicine-excel"
          />
          <Button variant="outline" onClick={() => medicineFileRef.current?.click()} data-testid="button-upload-medicines">
            <Upload className="w-4 h-4 mr-2" />
            Import Medicines
          </Button>
          <CreateMedicineDialog open={medicineDialogOpen} onOpenChange={setMedicineDialogOpen} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" /> Total Medicines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{medicines?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4" /> Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{suppliers?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{lowStock?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{orders?.filter(o => o.status === 'pending').length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="prescriptions" className="w-full">
        <TabsList>
          <TabsTrigger value="prescriptions" data-testid="tab-prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Purchase Orders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="prescriptions" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg">Prescriptions to Dispense</CardTitle>
              <Select value={prescriptionFilter} onValueChange={setPrescriptionFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-prescription-filter">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid Only</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending">Pending Dispense</SelectItem>
                  <SelectItem value="dispensed">Already Dispensed</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {filteredPrescriptions && filteredPrescriptions.length > 0 ? (
                <div className="space-y-3">
                  {filteredPrescriptions.map((rx) => (
                    <div key={rx.id} className="flex items-center justify-between p-4 rounded-lg border" data-testid={`row-prescription-${rx.id}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{getPatientName(rx.patientId)}</p>
                          <Badge variant={rx.paymentStatus === "paid" ? "default" : rx.paymentStatus === "pending" ? "secondary" : "outline"}>
                            {rx.paymentStatus === "paid" ? "Paid" : rx.paymentStatus === "pending" ? "Pending Payment" : "Unbilled"}
                          </Badge>
                          {rx.isDispensed && <Badge variant="default" className="bg-green-600">Dispensed</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Prescribed by Dr. {getDoctorName(rx.doctorId)} | {rx.createdAt ? format(new Date(rx.createdAt), "MMM d, yyyy") : ""}
                        </p>
                        <p className="text-sm mt-1 font-medium">{rx.medications}</p>
                        <p className="text-xs text-muted-foreground">{rx.dosage} - {rx.frequency} for {rx.duration}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!rx.isDispensed && (
                          <Button 
                            size="sm" 
                            disabled={rx.paymentStatus !== "paid" || dispensePrescription.isPending}
                            onClick={() => dispensePrescription.mutate({ id: rx.id, dispensedBy: 1 })}
                            data-testid={`button-dispense-${rx.id}`}
                          >
                            {rx.paymentStatus !== "paid" ? "Pay First" : "Dispense"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Pill className="w-12 h-12 mx-auto mb-4" />
                  <p>No prescriptions to display</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {medicines && medicines.length > 0 ? (
                <div className="space-y-3">
                  {medicines.slice(0, 10).map((medicine) => {
                    const isExpiringSoon = medicine.expiryDate && new Date(medicine.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                    const isExpired = medicine.expiryDate && new Date(medicine.expiryDate) < new Date();
                    return (
                    <div key={medicine.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`row-medicine-${medicine.id}`}>
                      <div className="flex-1">
                        <p className="font-medium">{medicine.name}</p>
                        <p className="text-sm text-muted-foreground">{medicine.genericName} - {medicine.code}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {medicine.expiryDate && (
                            <span className={isExpired ? "text-destructive" : isExpiringSoon ? "text-amber-600" : ""}>
                              Exp: {format(new Date(medicine.expiryDate), "MMM yyyy")}
                            </span>
                          )}
                          {medicine.batchNumber && <span>Batch: {medicine.batchNumber}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isExpired && <Badge variant="destructive">Expired</Badge>}
                        {isExpiringSoon && !isExpired && <Badge variant="outline" className="text-amber-600 border-amber-600">Expiring Soon</Badge>}
                        <Badge variant={(medicine.quantity || 0) <= (medicine.reorderLevel || 10) ? "destructive" : "secondary"}>
                          Qty: {medicine.quantity}
                        </Badge>
                        <span className="text-sm font-medium">${medicine.sellingPrice}</span>
                      </div>
                    </div>
                  );})}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4" />
                  <p>No medicines in inventory</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {suppliers && suppliers.length > 0 ? (
                <div className="space-y-3">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`row-supplier-${supplier.id}`}>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        <p className="text-sm text-muted-foreground">{supplier.contactPerson} - {supplier.phone}</p>
                      </div>
                      <Badge variant={supplier.isActive ? "default" : "secondary"}>
                        {supplier.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-4" />
                  <p>No suppliers registered</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {orders && orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`row-order-${order.id}`}>
                      <div>
                        <p className="font-medium">Order #{order.id}</p>
                        <p className="text-sm text-muted-foreground">{new Date(order.orderDate || '').toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>{order.status}</Badge>
                        <span className="font-medium">${order.totalAmount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4" />
                  <p>No purchase orders</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateMedicineDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof medicineFormSchema>) => {
      const payload = {
        name: data.name,
        genericName: data.genericName,
        code: data.code,
        categoryId: data.categoryId,
        formId: data.formId,
        supplierId: data.supplierId || undefined,
        batchNumber: data.batchNumber || undefined,
        expiryDate: data.expiryDate || undefined,
        quantity: data.quantity,
        reorderLevel: data.reorderLevel,
        unitPrice: String(data.purchasePrice || 0),
        sellingPrice: String(data.sellingPrice),
      };
      return apiRequest("POST", "/api/medicines", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({ title: "Medicine added", description: "The medicine has been successfully added." });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof medicineFormSchema>>({
    resolver: zodResolver(medicineFormSchema),
    defaultValues: {
      name: "",
      genericName: "",
      code: "",
      supplierId: undefined,
      batchNumber: "",
      expiryDate: "",
      quantity: 0,
      reorderLevel: 10,
      purchasePrice: 0,
      sellingPrice: 0,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-medicine">
          <Plus className="w-4 h-4 mr-2" />
          Add Medicine
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Medicine</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicine Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Amoxicillin 500mg" {...field} data-testid="input-medicine-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="genericName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Generic Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Amoxicillin" {...field} data-testid="input-generic-name" />
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
                  <FormLabel>Code/SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., MED001" {...field} data-testid="input-code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger data-testid="select-supplier">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
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
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., BATCH001" {...field} data-testid="input-batch-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-expiry-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-quantity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reorderLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-reorder-level" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-purchase-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-selling-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-medicine">
              {mutation.isPending ? "Adding..." : "Add Medicine"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CreateSupplierDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof supplierFormSchema>) => {
      return apiRequest("POST", "/api/suppliers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Supplier added", description: "The supplier has been successfully added." });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof supplierFormSchema>>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-add-supplier">
          <Truck className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., MedSupply Co." {...field} data-testid="input-supplier-name" />
                  </FormControl>
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
                    <Input placeholder="e.g., +1-555-0123" {...field} data-testid="input-supplier-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="e.g., supplier@example.com" {...field} data-testid="input-supplier-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 123 Supply St." {...field} data-testid="input-supplier-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-supplier">
              {mutation.isPending ? "Adding..." : "Add Supplier"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
