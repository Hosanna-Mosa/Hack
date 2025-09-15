import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Bell, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  School,
  Phone,
  Mail,
  LogOut
} from "lucide-react";
import { AttendanceCalendar } from "./AttendanceCalendar";
import { NotificationPanel } from "./NotificationPanel";

interface Child {
  id: string;
  name: string;
  grade: string;
  class: string;
  avatar?: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  totalDays: number;
  attendanceRate: number;
}

interface ParentDashboardProps {
  onLogout: () => void;
}

export function ParentDashboard({ onLogout }: ParentDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "notifications">("overview");

  // Mock data - would come from API
  const child: Child = {
    id: "1",
    name: "Emma Johnson",
    grade: "Grade 5",
    class: "Class A",
    avatar: "/placeholder-avatar.jpg"
  };
  
  const attendanceStats: AttendanceStats = {
    present: 142,
    absent: 8,
    late: 5,
    totalDays: 155,
    attendanceRate: 91.6
  };

  const recentActivity = [
    { date: "2024-01-15", status: "present", notes: "" },
    { date: "2024-01-14", status: "late", notes: "Traffic delay" },
    { date: "2024-01-13", status: "present", notes: "" },
    { date: "2024-01-12", status: "absent", notes: "Sick" },
    { date: "2024-01-11", status: "present", notes: "" },
  ];

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
      <header className="bg-card border-b shadow-design-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <School className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-semibold text-foreground">Parent Portal</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <MessageCircle className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "overview" 
                ? "bg-card text-primary shadow-design-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "calendar" 
                ? "bg-card text-primary shadow-design-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-4 h-4 mr-2 inline" />
            Calendar
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "notifications" 
                ? "bg-card text-primary shadow-design-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bell className="w-4 h-4 mr-2 inline" />
            Notifications
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Child Profile Card */}
            <Card className="shadow-design-md border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={child.avatar} alt={child.name} />
                    <AvatarFallback>
                      <User className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{child.name}</h3>
                    <p className="text-sm text-muted-foreground">{child.grade} • {child.class}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Student ID</p>
                    <p className="font-medium">STU2024001</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Academic Year</p>
                    <p className="font-medium">2024-2025</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Teacher
                </Button>
              </CardContent>
            </Card>

            {/* Attendance Overview */}
            <Card className="shadow-design-md border-0">
              <CardHeader>
                <CardTitle>Attendance Overview</CardTitle>
                <CardDescription>Current academic year statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{attendanceStats.attendanceRate}%</div>
                  <p className="text-sm text-muted-foreground">Overall Attendance Rate</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-success">{attendanceStats.present}</div>
                    <p className="text-muted-foreground">Present</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-danger">{attendanceStats.absent}</div>
                    <p className="text-muted-foreground">Absent</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-warning">{attendanceStats.late}</div>
                    <p className="text-muted-foreground">Late</p>
                  </div>
                </div>
                
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-secondary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${attendanceStats.attendanceRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-design-md border-0">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Last 5 school days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(activity.status)}
                        <div>
                          <p className="text-sm font-medium">{activity.date}</p>
                          {activity.notes && (
                            <p className="text-xs text-muted-foreground">{activity.notes}</p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(activity.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="lg:col-span-3 shadow-design-md border-0">
              <CardHeader>
                <CardTitle>Upcoming School Events</CardTitle>
                <CardDescription>Important dates and events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {upcomingEvents.map((event, index) => (
                    <div key={index} className="p-4 border rounded-lg hover:shadow-design-sm transition-shadow">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{event.event}</h4>
                          <p className="text-sm text-muted-foreground">{event.date}</p>
                          <p className="text-sm text-muted-foreground flex items-center mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {event.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "calendar" && <AttendanceCalendar />}
        {activeTab === "notifications" && <NotificationPanel />}
      </div>
    </div>
  );
}