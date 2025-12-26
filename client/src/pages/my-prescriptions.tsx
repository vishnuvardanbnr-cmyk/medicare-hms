import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, Calendar, Stethoscope, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Prescription, Doctor } from "@shared/schema";

export default function MyPrescriptions() {
  const { data: prescriptions = [], isLoading } = useQuery<Prescription[]>({
    queryKey: ['/api/patient/prescriptions'],
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'completed': return <Badge variant="secondary">Completed</Badge>;
      case 'dispensed': return <Badge className="bg-blue-500 text-white">Dispensed</Badge>;
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
        <h1 className="text-2xl font-bold text-foreground">My Prescriptions</h1>
        <p className="text-muted-foreground">View your prescribed medications</p>
      </div>

      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No prescriptions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prescriptions.map(prescription => {
            const doctor = doctors.find(d => d.id === prescription.doctorId);
            let medications: Array<{name: string; dosage: string; frequency: string; duration: string;}> = [];
            try {
              if (prescription.medications) {
                medications = typeof prescription.medications === 'string' 
                  ? JSON.parse(prescription.medications as string) 
                  : (prescription.medications as Array<{name: string; dosage: string; frequency: string; duration: string;}>);
              }
            } catch { medications = []; }

            return (
              <Card key={prescription.id} data-testid={`prescription-card-${prescription.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Pill className="w-5 h-5 text-primary" />
                      Prescription #{prescription.id}
                    </CardTitle>
                    {getStatusBadge(prescription.dispensingStatus || 'pending')}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      Dr. {doctor?.name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(prescription.createdAt!), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {prescription.diagnosis && (
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Diagnosis</p>
                      <p className="text-sm text-muted-foreground">{prescription.diagnosis}</p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Medications</p>
                    {medications.length > 0 ? (
                      <div className="grid gap-2">
                        {medications.map((med, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <p className="font-medium">{med.name}</p>
                            <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                              <span>Dosage: {med.dosage}</span>
                              <span>Frequency: {med.frequency}</span>
                              <span>Duration: {med.duration}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No medications listed</p>
                    )}
                  </div>

                  {prescription.notes && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Doctor's Notes</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">{prescription.notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
