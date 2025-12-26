import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, DollarSign, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Invoice } from "@shared/schema";

export default function MyBills() {
  const { data: bills = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/patient/bills'],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'paid': return <Badge className="bg-green-500 text-white">Paid</Badge>;
      case 'partial': return <Badge className="bg-amber-500 text-white">Partial</Badge>;
      case 'overdue': return <Badge variant="destructive">Overdue</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPending = bills
    .filter(b => b.status !== 'paid')
    .reduce((sum, b) => sum + Number(b.totalAmount) - Number(b.paidAmount || 0), 0);

  const totalPaid = bills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Bills</h1>
        <p className="text-muted-foreground">View and track your billing history</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold" data-testid="text-pending-amount">Rs. {totalPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold" data-testid="text-total-paid">Rs. {totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-2xl font-bold" data-testid="text-total-bills">{bills.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {bills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No bills found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bills.map(bill => (
                <div 
                  key={bill.id} 
                  className="p-4 border rounded-lg flex items-center justify-between"
                  data-testid={`bill-card-${bill.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Invoice #{bill.invoiceNumber}</span>
                      {getStatusBadge(bill.status)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(bill.invoiceDate), 'MMM dd, yyyy')}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Medical Services
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">Rs. {Number(bill.totalAmount).toFixed(2)}</p>
                    {bill.status !== 'paid' && (
                      <p className="text-sm text-muted-foreground">
                        Paid: Rs. {Number(bill.paidAmount || 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
