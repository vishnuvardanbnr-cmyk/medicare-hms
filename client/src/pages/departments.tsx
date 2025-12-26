import { useDepartments } from "@/hooks/use-departments";
import { useDoctors } from "@/hooks/use-doctors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Stethoscope, X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DepartmentsPage() {
  const { data: departments, isLoading } = useDepartments();
  const { data: doctors } = useDoctors();
  const [selectedDept, setSelectedDept] = useState<number | null>(null);

  const selectedDepartment = departments?.find(d => d.id === selectedDept);
  const departmentDoctors = doctors?.filter(d => d.departmentId === selectedDept);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Departments</h2>
        <p className="text-muted-foreground mt-1">Hospital units and services.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : departments?.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No departments found.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {departments?.map((dept) => {
            const deptDoctorCount = doctors?.filter(d => d.departmentId === dept.id).length || 0;
            return (
              <Card key={dept.id} className="border-none shadow-md hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
                  <CardTitle className="text-lg font-bold">{dept.name}</CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
                    <Building2 className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{dept.description || "No description provided."}</p>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary p-0 h-auto"
                      onClick={() => setSelectedDept(dept.id)}
                      data-testid={`button-view-doctors-${dept.id}`}
                    >
                      <Stethoscope className="w-3 h-3 mr-1" />
                      View Doctors ({deptDoctorCount})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={selectedDept !== null} onOpenChange={(open) => !open && setSelectedDept(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {selectedDepartment?.name} - Doctors
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {departmentDoctors && departmentDoctors.length > 0 ? (
              departmentDoctors.map((doctor) => (
                <Card key={doctor.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {doctor.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{doctor.name}</h4>
                      <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{doctor.experience} yrs exp</Badge>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No doctors assigned to this department yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
