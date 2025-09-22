import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  School,
  Phone,
  Mail,
  LogOut,
  Loader2
} from "lucide-react";
import { AttendanceCalendar } from "./AttendanceCalendar";
import { useToast } from "@/hooks/use-toast";
import ParentAPI from "@/lib/api";

interface Student {
  _id: string;
  name: string;
  studentId: string;
  classId?: {
    _id: string;
    name: string;
    grade: string;
    section: string;
  };
  photoUrl?: string;
  dateOfBirth?: string;
  status?: string;
  isActive?: boolean;
  academicInfo?: {
    admissionDate: string;
    admissionNumber: string;
    currentGrade: string;
    currentSection: string;
    previousSchool?: string;
    transportInfo?: {
      route?: string;
      stop?: string;
      vehicleNumber?: string;
    };
  };
  contactInfo?: {
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
      email: string;
    };
    medicalInfo?: {
      bloodGroup: string;
      allergies: string[];
      medications: string[];
      medicalConditions: string[];
    };
  };
}

interface AttendanceStats {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

interface RecentActivity {
  date: string;
  status: string;
  notes: string;
  timeIn?: string;
  timeOut?: string;
}

interface ParentDashboardProps {
  onLogout: () => void;
}

export function ParentDashboard({ onLogout }: ParentDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "calendar">("overview");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch parent profile and student data
  useEffect(() => {
    const fetchParentData = async () => {
      try {
        const data = await ParentAPI.getProfile();

        if (data.success) {
          setStudents(data.data.studentIds || []);
          if (data.data.studentIds && data.data.studentIds.length > 0) {
            setSelectedStudent(data.data.studentIds[0]);
          }
        } else {
          throw new Error(data.message || 'Failed to fetch parent data');
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load parent data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchParentData();
  }, [toast]);

  // Fetch attendance data when student is selected
  useEffect(() => {
    if (selectedStudent) {
      fetchAttendanceData(selectedStudent._id);
    }
  }, [selectedStudent]);

  const fetchAttendanceData = async (studentId: string) => {
    try {
      const data = await ParentAPI.getStudentAttendance(studentId);

      if (data.success) {
        setAttendanceStats(data.data.attendanceStats);
        setRecentActivity(data.data.recentActivity);
      } else {
        throw new Error(data.message || 'Failed to fetch attendance data');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load attendance data",
        variant: "destructive",
      });
    }
  };

  const upcomingEvents = [
    { date: "2024-01-20", event: "Parent-Teacher Conference", time: "2:00 PM" },
    { date: "2024-01-25", event: "School Science Fair", time: "10:00 AM" },
    { date: "2024-02-01", event: "Term Exam Begins", time: "9:00 AM" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return <CheckCircle className="w-4 h-4 text-success" />;
      case "absent": return <XCircle className="w-4 h-4 text-danger" />;
      case "late": return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      present: "default",
      absent: "destructive", 
      late: "secondary"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Header */}
      <header className="bg-card border-b shadow-design-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <School className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <h1 className="text-base sm:text-lg font-semibold text-foreground">Parent Portal</h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button variant="ghost" size="icon" onClick={onLogout} className="h-8 w-8 sm:h-10 sm:w-10">
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Student Information Header */}
        {isLoading ? (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-card rounded-lg border shadow-design-sm">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-5 sm:h-6 bg-muted rounded animate-pulse mb-2"></div>
                <div className="h-3 sm:h-4 bg-muted rounded animate-pulse w-2/3"></div>
              </div>
            </div>
          </div>
        ) : selectedStudent ? (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10 shadow-design-md overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16 sm:w-20 sm:h-20 ring-4 ring-primary/10">
                      <AvatarImage src={selectedStudent.photoUrl} alt={selectedStudent.name} />
                      <AvatarFallback className="text-lg sm:text-xl font-bold bg-gradient-primary text-primary-foreground">
                        {selectedStudent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-background"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-3xl font-bold text-foreground mb-1">{selectedStudent.name}</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm sm:text-base text-muted-foreground">
                      <span className="font-medium">ID: {selectedStudent.studentId}</span>
                      {selectedStudent.classId && (
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs sm:text-sm font-medium">
                          {selectedStudent.classId.grade} {selectedStudent.classId.section}
                        </span>
                      )}
                    </div>
                    {selectedStudent.academicInfo?.admissionNumber && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium">Admission:</span> {selectedStudent.academicInfo.admissionNumber}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:items-end space-y-2">
                  <div className="text-right">
                    <div className="text-xs sm:text-sm text-muted-foreground font-medium">Academic Year</div>
                    <div className="text-lg sm:text-xl font-bold text-primary">2024-2025</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span className="text-xs sm:text-sm font-medium text-success">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-card rounded-lg border shadow-design-sm">
            <div className="text-center py-6 sm:py-8">
              <User className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Student Selected</h3>
              <p className="text-sm sm:text-base text-muted-foreground">Please select a student to view their information</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-4 sm:mb-6 bg-muted p-1 rounded-lg w-full sm:w-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "overview" 
                ? "bg-card text-primary shadow-design-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "calendar" 
                ? "bg-card text-primary shadow-design-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-4 h-4 mr-1 sm:mr-2 inline" />
            <span className="hidden sm:inline">Calendar</span>
            <span className="sm:hidden">Cal</span>
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Student Selection and Profile Card */}
            <Card className="shadow-design-md border-0">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center space-x-2 sm:space-x-3">
                  {isLoading ? (
                    <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin" />
                  ) : selectedStudent ? (
                    <>
                      <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                        <AvatarImage src={selectedStudent.photoUrl} alt={selectedStudent.name} />
                        <AvatarFallback>
                          <User className="w-5 h-5 sm:w-6 sm:h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-semibold truncate">{selectedStudent.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {selectedStudent.classId ? `${selectedStudent.classId.grade} • ${selectedStudent.classId.section}` : 'No class assigned'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold">No Students Found</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Please contact your school administrator</p>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {selectedStudent && (
                  <>
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <p className="text-muted-foreground">Student ID</p>
                        <p className="font-medium">{selectedStudent.studentId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Academic Year</p>
                        <p className="font-medium">2024-2025</p>
                      </div>
                    </div>

                    {/* Academic Information */}
                    {selectedStudent.academicInfo && (
                      <div className="space-y-2 sm:space-y-3">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">Academic Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                          {selectedStudent.academicInfo.admissionNumber && (
                            <div>
                              <p className="text-muted-foreground">Admission Number</p>
                              <p className="font-medium">{selectedStudent.academicInfo.admissionNumber}</p>
                            </div>
                          )}
                          {selectedStudent.academicInfo.currentGrade && (
                            <div>
                              <p className="text-muted-foreground">Current Grade</p>
                              <p className="font-medium">{selectedStudent.academicInfo.currentGrade}</p>
                            </div>
                          )}
                          {selectedStudent.academicInfo.admissionDate && (
                            <div>
                              <p className="text-muted-foreground">Admission Date</p>
                              <p className="font-medium">
                                {new Date(selectedStudent.academicInfo.admissionDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Personal Information */}
                    {selectedStudent.dateOfBirth && (
                      <div className="space-y-2 sm:space-y-3">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">Personal Information</h4>
                        <div className="text-xs sm:text-sm">
                          <p className="text-muted-foreground">Date of Birth</p>
                          <p className="font-medium">
                            {new Date(selectedStudent.dateOfBirth).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Contact Information */}
                    {selectedStudent.contactInfo && (
                      <div className="space-y-2 sm:space-y-3">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">Contact Information</h4>
                        <div className="space-y-2 text-xs sm:text-sm">
                          {selectedStudent.contactInfo.address && (
                            <div>
                              <p className="text-muted-foreground">Address</p>
                              <p className="font-medium">
                                {selectedStudent.contactInfo.address.street && `${selectedStudent.contactInfo.address.street}, `}
                                {selectedStudent.contactInfo.address.city && `${selectedStudent.contactInfo.address.city}, `}
                                {selectedStudent.contactInfo.address.state && `${selectedStudent.contactInfo.address.state}, `}
                                {selectedStudent.contactInfo.address.zipCode && `${selectedStudent.contactInfo.address.zipCode}`}
                                {selectedStudent.contactInfo.address.country && `, ${selectedStudent.contactInfo.address.country}`}
                              </p>
                            </div>
                          )}
                          {selectedStudent.contactInfo.emergencyContact && (
                            <div>
                              <p className="text-muted-foreground">Emergency Contact</p>
                              <p className="font-medium">
                                {selectedStudent.contactInfo.emergencyContact.name} ({selectedStudent.contactInfo.emergencyContact.relationship})
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {selectedStudent.contactInfo.emergencyContact.phone}
                                {selectedStudent.contactInfo.emergencyContact.email && ` • ${selectedStudent.contactInfo.emergencyContact.email}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Transport Information */}
                    {selectedStudent.academicInfo?.transportInfo && (
                      <div className="space-y-2 sm:space-y-3">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">Transport Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                          {selectedStudent.academicInfo.transportInfo.route && (
                            <div>
                              <p className="text-muted-foreground">Route</p>
                              <p className="font-medium">{selectedStudent.academicInfo.transportInfo.route}</p>
                            </div>
                          )}
                          {selectedStudent.academicInfo.transportInfo.stop && (
                            <div>
                              <p className="text-muted-foreground">Stop</p>
                              <p className="font-medium">{selectedStudent.academicInfo.transportInfo.stop}</p>
                            </div>
                          )}
                          {selectedStudent.academicInfo.transportInfo.vehicleNumber && (
                            <div>
                              <p className="text-muted-foreground">Vehicle Number</p>
                              <p className="font-medium">{selectedStudent.academicInfo.transportInfo.vehicleNumber}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Medical Information */}
                    {selectedStudent.contactInfo?.medicalInfo && (
                      <div className="space-y-2 sm:space-y-3">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground">Medical Information</h4>
                        <div className="space-y-2 text-xs sm:text-sm">
                          {selectedStudent.contactInfo.medicalInfo.bloodGroup && (
                            <div>
                              <p className="text-muted-foreground">Blood Group</p>
                              <p className="font-medium">{selectedStudent.contactInfo.medicalInfo.bloodGroup}</p>
                            </div>
                          )}
                          {selectedStudent.contactInfo.medicalInfo.allergies && selectedStudent.contactInfo.medicalInfo.allergies.length > 0 && (
                            <div>
                              <p className="text-muted-foreground">Allergies</p>
                              <p className="font-medium">{selectedStudent.contactInfo.medicalInfo.allergies.join(', ')}</p>
                            </div>
                          )}
                          {selectedStudent.contactInfo.medicalInfo.medicalConditions && selectedStudent.contactInfo.medicalInfo.medicalConditions.length > 0 && (
                            <div>
                              <p className="text-muted-foreground">Medical Conditions</p>
                              <p className="font-medium">{selectedStudent.contactInfo.medicalInfo.medicalConditions.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Student Status */}
                    <div className="space-y-2 sm:space-y-3">
                      <h4 className="text-xs sm:text-sm font-semibold text-foreground">Status</h4>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${selectedStudent.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs sm:text-sm font-medium">
                          {selectedStudent.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {selectedStudent.status && (
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            • {selectedStudent.status.charAt(0).toUpperCase() + selectedStudent.status.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>

                  </>
                )}
                
                {/* Student Selection Dropdown */}
                {students.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Select Student:</label>
                    <select 
                      value={selectedStudent?._id || ''} 
                      onChange={(e) => {
                        const student = students.find(s => s._id === e.target.value);
                        setSelectedStudent(student || null);
                      }}
                      className="w-full p-2 text-xs sm:text-sm border rounded-md"
                    >
                      {students.map((student) => (
                        <option key={student._id} value={student._id}>
                          {student.name} - {student.studentId} {student.classId ? `(${student.classId.grade} ${student.classId.section})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Overview */}
            <Card className="shadow-design-md border-0">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Attendance Overview</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Current academic year statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6 sm:py-8">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
                  </div>
                ) : attendanceStats ? (
                  <>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-primary">{attendanceStats.attendanceRate}%</div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Overall Attendance Rate</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-semibold text-success">{attendanceStats.present}</div>
                        <p className="text-muted-foreground">Present</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-semibold text-danger">{attendanceStats.absent}</div>
                        <p className="text-muted-foreground">Absent</p>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-semibold text-warning">{attendanceStats.late}</div>
                        <p className="text-muted-foreground">Late</p>
                      </div>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-1.5 sm:h-2">
                      <div 
                        className="bg-gradient-secondary h-1.5 sm:h-2 rounded-full transition-all duration-300"
                        style={{ width: `${attendanceStats.attendanceRate}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-xs sm:text-sm text-muted-foreground">No attendance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-design-md border-0">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Last 5 school days</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6 sm:py-8">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                          {getStatusIcon(activity.status)}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium truncate">{activity.date}</p>
                            {activity.notes && (
                              <p className="text-xs text-muted-foreground truncate">{activity.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {getStatusBadge(activity.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-xs sm:text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}

        {activeTab === "calendar" && <AttendanceCalendar studentId={selectedStudent?._id} />}
      </div>
    </div>
  );
}