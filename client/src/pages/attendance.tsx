import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Clock, LogIn, LogOut, Calendar, Users, Timer, CheckCircle, XCircle, AlertTriangle, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { User } from "@shared/schema";

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  hoursWorked: string | null;
  notes: string | null;
}

function DutySettingsForm({ user, wards, toast }: { user: any; wards: any[]; toast: any }) {
  const [dutyStart, setDutyStart] = useState(user?.dutyStartTime || "09:00");
  const [dutyEnd, setDutyEnd] = useState(user?.dutyEndTime || "17:00");
  const [wardId, setWardId] = useState<string>(user?.assignedWardId?.toString() || "none");

  const updateDutyMutation = useMutation({
    mutationFn: (data: { dutyStartTime?: string; dutyEndTime?: string; assignedWardId?: number | null }) =>
      apiRequest("PATCH", `/api/users/${user?.id}/duty-settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: "Updated", description: "Your duty settings have been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Update failed", variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateDutyMutation.mutate({
      dutyStartTime: dutyStart,
      dutyEndTime: dutyEnd,
      assignedWardId: wardId && wardId !== "none" ? Number(wardId) : null
    });
  };

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle>Duty Settings</CardTitle>
        <CardDescription>Configure your work schedule and ward assignment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dutyStart">Duty Start Time</Label>
            <Input
              id="dutyStart"
              type="time"
              value={dutyStart}
              onChange={(e) => setDutyStart(e.target.value)}
              data-testid="input-duty-start"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dutyEnd">Duty End Time</Label>
            <Input
              id="dutyEnd"
              type="time"
              value={dutyEnd}
              onChange={(e) => setDutyEnd(e.target.value)}
              data-testid="input-duty-end"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Assigned Ward</Label>
          <Select value={wardId} onValueChange={setWardId}>
            <SelectTrigger data-testid="select-ward">
              <SelectValue placeholder="Select a ward" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Ward</SelectItem>
              {wards.map((ward) => (
                <SelectItem key={ward.id} value={ward.id.toString()}>
                  {ward.name} ({ward.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateDutyMutation.isPending}
          data-testid="button-save-duty"
        >
          {updateDutyMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: todayAttendance, isLoading: todayLoading } = useQuery<AttendanceRecord | null>({
    queryKey: ['/api/attendance/today'],
  });

  const { data: myHistory = [], isLoading: historyLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/user', user?.id],
    enabled: !!user?.id,
  });

  const { data: allAttendance = [], isLoading: allLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/date', selectedDate],
    enabled: user?.role === 'admin',
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin',
  });

  const { data: wards = [] } = useQuery<any[]>({
    queryKey: ['/api/wards'],
  });

  const checkInMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/attendance/check-in"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/user', user?.id] });
      toast({ title: "Checked In", description: "You have successfully checked in for today." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Check-in failed", variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/attendance/check-out"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/user', user?.id] });
      toast({ title: "Checked Out", description: "You have successfully checked out." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Check-out failed", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Present</Badge>;
      case 'late':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><AlertTriangle className="w-3 h-3 mr-1" />Late</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Absent</Badge>;
      case 'half-day':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><Timer className="w-3 h-3 mr-1" />Half Day</Badge>;
      case 'on-leave':
        return <Badge variant="secondary">On Leave</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "-";
    return format(new Date(timestamp), "hh:mm a");
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const hasCheckedIn = !!todayAttendance?.checkInTime;
  const hasCheckedOut = !!todayAttendance?.checkOutTime;

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Attendance</h2>
        <p className="text-muted-foreground mt-1">Track your work hours and attendance.</p>
      </div>

      <Tabs defaultValue="check-in" className="space-y-6">
        <TabsList>
          <TabsTrigger value="check-in" data-testid="tab-check-in">
            <Clock className="w-4 h-4 mr-2" />
            Check In/Out
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Calendar className="w-4 h-4 mr-2" />
            My History
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Timer className="w-4 h-4 mr-2" />
            Duty Settings
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="admin" data-testid="tab-admin">
              <Users className="w-4 h-4 mr-2" />
              All Staff
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="check-in" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div variants={item}>
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Today's Status
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(), "EEEE, MMMM do, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {todayLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <div className="mt-1">
                            {todayAttendance ? getStatusBadge(todayAttendance.status) : <Badge variant="outline">Not Checked In</Badge>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Hours Worked</p>
                          <p className="text-2xl font-bold text-foreground">
                            {todayAttendance?.hoursWorked ? `${todayAttendance.hoursWorked}h` : "0h"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                          <div className="flex items-center gap-2 mb-2">
                            <LogIn className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">Check In</span>
                          </div>
                          <p className="text-lg font-semibold text-green-800 dark:text-green-300">
                            {formatTime(todayAttendance?.checkInTime || null)}
                          </p>
                        </div>
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                          <div className="flex items-center gap-2 mb-2">
                            <LogOut className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700 dark:text-red-400">Check Out</span>
                          </div>
                          <p className="text-lg font-semibold text-red-800 dark:text-red-300">
                            {formatTime(todayAttendance?.checkOutTime || null)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Button
                          className="flex-1"
                          size="lg"
                          onClick={() => checkInMutation.mutate()}
                          disabled={hasCheckedIn || checkInMutation.isPending}
                          data-testid="button-check-in"
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          {checkInMutation.isPending ? "Checking In..." : hasCheckedIn ? "Already Checked In" : "Check In"}
                        </Button>
                        <Button
                          className="flex-1"
                          size="lg"
                          variant="outline"
                          onClick={() => checkOutMutation.mutate()}
                          disabled={!hasCheckedIn || hasCheckedOut || checkOutMutation.isPending}
                          data-testid="button-check-out"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {checkOutMutation.isPending ? "Checking Out..." : hasCheckedOut ? "Already Checked Out" : "Check Out"}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Your Duty Schedule</CardTitle>
                  <CardDescription>Your assigned work hours</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Duty Start</p>
                      <p className="text-xl font-semibold text-foreground">
                        {(user as any)?.dutyStartTime || "Not Set"}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Duty End</p>
                      <p className="text-xl font-semibold text-foreground">
                        {(user as any)?.dutyEndTime || "Not Set"}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Assigned Ward</p>
                    <p className="text-xl font-semibold text-foreground">
                      {wards.find(w => w.id === (user as any)?.assignedWardId)?.name || "Not Assigned"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Your past attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : !myHistory || myHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No attendance records found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myHistory.slice(0, 30).map((record) => (
                      <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                        <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{formatTime(record.checkInTime)}</TableCell>
                        <TableCell>{formatTime(record.checkOutTime)}</TableCell>
                        <TableCell>{record.hoursWorked ? `${record.hoursWorked}h` : "-"}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <DutySettingsForm user={user} wards={wards} toast={toast} />
        </TabsContent>

        {user?.role === 'admin' && (
          <TabsContent value="admin" className="space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Staff Attendance Overview</CardTitle>
                <CardDescription>View all staff attendance for a specific date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Select Date</Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      data-testid="input-admin-date"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label>Search Staff</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-staff"
                      />
                    </div>
                  </div>
                </div>

                {allLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((staff) => {
                        const record = allAttendance.find(a => a.userId === staff.id);
                        return (
                          <TableRow key={staff.id} data-testid={`row-staff-${staff.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{staff.name}</p>
                                <p className="text-sm text-muted-foreground">{staff.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{staff.role}</Badge>
                            </TableCell>
                            <TableCell>{record ? formatTime(record.checkInTime) : "-"}</TableCell>
                            <TableCell>{record ? formatTime(record.checkOutTime) : "-"}</TableCell>
                            <TableCell>{record?.hoursWorked ? `${record.hoursWorked}h` : "-"}</TableCell>
                            <TableCell>{record ? getStatusBadge(record.status) : getStatusBadge('absent')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  );
}
