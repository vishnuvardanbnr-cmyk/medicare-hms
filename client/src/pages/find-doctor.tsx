import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Search, Calendar, Clock, Star, Phone, Mail } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import type { Doctor, Department } from "@shared/schema";

export default function FindDoctor() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");

  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  const activeDoctors = doctors.filter(d => d.isActive);
  const specialties = Array.from(new Set(activeDoctors.map(d => d.specialty)));

  const filteredDoctors = activeDoctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = !selectedSpecialty || doctor.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

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
        <h1 className="text-2xl font-bold text-foreground">Find a Doctor</h1>
        <p className="text-muted-foreground">Search and book appointments with our specialists</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-doctor"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSpecialty === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSpecialty("")}
          >
            All
          </Button>
          {specialties.map(specialty => (
            <Button
              key={specialty}
              variant={selectedSpecialty === specialty ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSpecialty(specialty)}
            >
              {specialty}
            </Button>
          ))}
        </div>
      </div>

      {filteredDoctors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Stethoscope className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No doctors found matching your criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDoctors.map(doctor => {
            const department = departments.find(d => d.id === doctor.departmentId);
            return (
              <Card key={doctor.id} className="hover-elevate" data-testid={`doctor-card-${doctor.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">Dr. {doctor.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">{doctor.specialty}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span>{doctor.rating || '4.5'} Rating</span>
                      <span className="text-muted-foreground">|</span>
                      <span>{doctor.experience} years exp.</span>
                    </div>
                    {department && (
                      <p>{department.name}</p>
                    )}
                    {doctor.qualification && (
                      <p>{doctor.qualification}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{doctor.daysAvailable?.join(', ') || 'Mon-Fri'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{doctor.timeSlots || '9:00 AM - 5:00 PM'}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <p className="font-semibold text-primary">
                      Rs. {doctor.consultationFee || '500'}
                    </p>
                    <Link href="/my-appointments">
                      <Button size="sm" data-testid={`button-book-${doctor.id}`}>
                        Book Now
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
