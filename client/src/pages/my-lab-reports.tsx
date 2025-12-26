import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, TestTube, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import type { LabReport } from "@shared/schema";

export default function MyLabReports() {
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);

  const { data: labReports = [], isLoading } = useQuery<LabReport[]>({
    queryKey: ['/api/patient/lab-reports'],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case 'completed': return <Badge className="bg-green-500 text-white">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Lab Reports</h1>
        <p className="text-muted-foreground">View your laboratory test results</p>
      </div>

      {labReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No lab reports found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {labReports.map(report => (
            <Card key={report.id} data-testid={`lab-report-card-${report.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TestTube className="w-5 h-5 text-primary" />
                    {(report as any).testName || report.testName || 'Lab Test'}
                  </CardTitle>
                  {getStatusBadge(report.status)}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(report.createdAt!), 'MMM dd, yyyy')}
                </div>
              </CardHeader>
              <CardContent>
                {report.status === 'completed' && report.results ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Result Summary</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {typeof report.results === 'string' ? report.results : JSON.stringify(report.results).slice(0, 100)}...
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedReport(report)}
                            data-testid={`button-view-${report.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{report.testType} Results</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="grid gap-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Test Date:</span>
                                <span>{format(new Date(report.createdAt!), 'MMM dd, yyyy')}</span>
                              </div>
                              {report.resultDate && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Completed:</span>
                                  <span>{format(new Date(report.resultDate), 'MMM dd, yyyy')}</span>
                                </div>
                              )}
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                              <p className="font-medium mb-2">Results</p>
                              <pre className="text-sm whitespace-pre-wrap">
                                {typeof report.results === 'string' 
                                  ? report.results 
                                  : JSON.stringify(report.results, null, 2)}
                              </pre>
                            </div>
                            {report.remarks && (
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="font-medium mb-2">Notes</p>
                                <p className="text-sm">{report.remarks}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {report.status === 'pending' ? 'Awaiting sample collection' : 'Test in progress...'}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
