import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, MapPin, Heart, AlertCircle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { Patient } from "@shared/schema";

export default function MyProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: patient, isLoading } = useQuery<Patient>({
    queryKey: ['/api/patient/profile'],
  });

  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    address: '',
    city: '',
    emergencyContact: '',
    emergencyContactName: '',
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        city: patient.city || '',
        emergencyContact: patient.emergencyContact || '',
        emergencyContactName: patient.emergencyContactName || '',
      });
    }
  }, [patient]);

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PATCH", "/api/patient/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patient/profile'] });
      toast({ title: "Success", description: "Profile updated successfully!" });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Profile not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">View and update your personal information</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Patient ID</Label>
              <p className="font-medium" data-testid="text-patient-id">{patient.patientUid}</p>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Full Name</Label>
              <p className="font-medium" data-testid="text-patient-name">{patient.name}</p>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Date of Birth</Label>
              <p className="font-medium">{patient.dob}</p>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Gender</Label>
              <p className="font-medium capitalize">{patient.gender}</p>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Blood Group</Label>
              <p className="font-medium">{patient.bloodGroup || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    data-testid="input-address"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    data-testid="input-city"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={updateProfile.isPending} data-testid="button-save-profile">
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{patient.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{patient.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{patient.address ? `${patient.address}, ${patient.city}` : 'Not provided'}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Allergies</Label>
              <p className="font-medium">{patient.allergies || 'None reported'}</p>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Chronic Conditions</Label>
              <p className="font-medium">{patient.chronicConditions || 'None reported'}</p>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Current Medications</Label>
              <p className="font-medium">{patient.currentMedications || 'None reported'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Contact Name</Label>
                  <Input
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    data-testid="input-emergency-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    data-testid="input-emergency-phone"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Contact Name</Label>
                  <p className="font-medium">{patient.emergencyContactName || 'Not provided'}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Contact Phone</Label>
                  <p className="font-medium">{patient.emergencyContact || 'Not provided'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
