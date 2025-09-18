import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

// Mock data - in real app this would come from backend
const dashboardData = {
  todayAttendance: {
    present: 847,
    absent: 23,
    late: 12,
    total: 882,
    rate: 96.0
  },
  weeklyStats: {
    avgAttendance: 94.5,
    trend: "+2.3%",
    classesActive: 32,
    teachersPresent: 28
  },
  alerts: [
    { id: 1, type: "warning", message: "Class 5A has low attendance (78%)", time: "10:30 AM" },
    { id: 2, type: "info", message: "Parent-Teacher meeting scheduled for Friday", time: "9:15 AM" },
    { id: 3, type: "success", message: "Monthly report generated successfully", time: "8:45 AM" }
  ],
  recentActivity: [
    { id: 1, action: "Student registered", details: "John Doe added to Grade 7B", time: "2 hours ago" },
    { id: 2, action: "Attendance marked", details: "Grade 6A - 28/30 present", time: "3 hours ago" },
    { id: 3, action: "Report generated", details: "Weekly attendance summary", time: "1 day ago" }
  ]
};

export function Dashboard() {
  const [today, setToday] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [classesActive, setClassesActive] = useState(0);
  const [teachersPresent, setTeachersPresent] = useState(0);
  const [alerts, setAlerts] = useState(dashboardData.alerts);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [weeklySeries, setWeeklySeries] = useState<any[]>([]);
  const [classFillSeries, setClassFillSeries] = useState<any[]>([]);
  const attendanceRate = useMemo(() => (today.total ? ((today.present / today.total) * 100).toFixed(1) : '0.0'), [today]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const todayStr = new Date().toISOString().slice(0,10);
        const res = await apiRequest<any>(`/attendance?date=${todayStr}`);
        const list = (res.data as any[]) || [];
        const total = list.length;
        const present = list.filter(r => r.status === 'present').length;
        const late = list.filter(r => r.status === 'late').length;
        const absent = list.filter(r => r.status === 'absent' || r.status === 'excused').length;
        setToday({ present, late, absent, total });

        // Build per-class present/total for the bar chart using REAL attendance for today
        const byClass: Record<string, { name: string; present: number; total: number }> = {};
        for (const rec of list) {
          const cls = rec.classId || {};
          const name = `${cls.name || ''} ${cls.grade || ''}${cls.section ? '-' + cls.section : ''}`.trim() || 'Class';
          const key = cls._id || name;
          if (!byClass[key]) byClass[key] = { name, present: 0, total: 0 };
          byClass[key].total += 1;
          if (rec.status === 'present') byClass[key].present += 1;
        }
        const classSeries = Object.values(byClass)
          .sort((a,b) => b.total - a.total)
          .slice(0, 8)
          .map(c => ({ name: c.name, students: c.present }));
        setClassFillSeries(classSeries);
      } catch {}
      try {
        // Still show count of classes for header metrics alignment
        const res = await apiRequest<any>(`/classes`);
        const list = Array.isArray(res.data) ? res.data : [];
        setClassesActive(list.length);
      } catch {}
      try {
        // Derive a simple 7-day attendance trend (present counts)
        const days: any[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const dayStr = d.toISOString().slice(0,10);
          try {
            const r = await apiRequest<any>(`/attendance?date=${dayStr}`);
            const list = (r.data as any[]) || [];
            const present = list.filter(x => x.status === 'present').length;
            days.push({ day: dayStr.slice(5), present });
          } catch { days.push({ day: dayStr.slice(5), present: 0 }); }
        }
        setWeeklySeries(days);
      } catch {}
      try {
        const res = await apiRequest<any>(`/activity/recent`);
        setRecentActivity(Array.isArray(res.data) ? res.data : []);
      } catch {}
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-card-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your school overview.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="metric-card gradient-primary text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-white">Today's Attendance</CardTitle>
              <UserCheck className="w-6 h-6 text-white/80" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{attendanceRate}%</div>
            <p className="text-white/80 text-sm">
              {today.present} of {today.total} students
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Total Students</CardTitle>
              <Users className="w-6 h-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{today.total}</div>
            <p className="text-muted-foreground text-sm">Enrolled this semester</p>
          </CardContent>
        </Card>

        {/* Charts moved to Reports page */}
      </div>

      {/* Detailed Stats and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Breakdown */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Attendance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span>Present</span>
              </div>
              <span className="font-semibold">{today.present}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-warning rounded-full"></div>
                <span>Late</span>
              </div>
              <span className="font-semibold">{today.late}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-destructive rounded-full"></div>
                <span>Absent</span>
              </div>
              <span className="font-semibold">{today.absent}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between font-semibold">
                <span>Weekly Average</span>
                <div className="flex items-center gap-1">
                  <span>{attendanceRate}%</span>
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-success text-sm">--</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-shrink-0 mt-0.5">
                  {alert.type === "warning" && <AlertTriangle className="w-4 h-4 text-warning" />}
                  {alert.type === "success" && <CheckCircle className="w-4 h-4 text-success" />}
                  {alert.type === "info" && <Clock className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              View All Alerts
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.details}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              View Activity Log
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 flex-col gap-2" variant="outline" onClick={() => navigate('/students') }>
              <Users className="w-6 h-6" />
              <span className="text-sm">Add Student</span>
            </Button>
            <Button className="h-20 flex-col gap-2" variant="outline" onClick={() => navigate('/classes')}>
              <BookOpen className="w-6 h-6" />
              <span className="text-sm">Create Class</span>
            </Button>
            <Button className="h-20 flex-col gap-2" variant="outline">
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm">Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}