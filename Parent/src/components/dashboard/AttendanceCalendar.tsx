import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  FileText,
  Loader2
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { ParentAPI } from "@/lib/api";

interface AttendanceRecord {
  _id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  timeIn?: string;
  timeOut?: string;
  notes?: string;
  reason?: string;
  studentId?: string;
  className?: string;
}

interface AttendanceCalendarProps {
  studentId?: string;
}

export function AttendanceCalendar({ studentId }: AttendanceCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch attendance data from API
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!studentId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await ParentAPI.getStudentAttendance(studentId);
        console.log('API Response:', response); // Debug log
        
        if (response.success && response.data) {
          // Check if allRecords exists, otherwise fallback to recentActivity
          const recordsData = response.data.allRecords || response.data.recentActivity || [];
          
          if (Array.isArray(recordsData)) {
            const records = recordsData.map((record: any) => ({
              _id: record._id || `temp_${Date.now()}_${Math.random()}`,
              date: record.date,
              status: record.status,
              timeIn: record.timeIn,
              timeOut: record.timeOut,
              notes: record.notes,
              reason: record.reason,
              studentId: record.studentId || studentId,
              className: record.className || response.data.student?.classId?.name || 'Unknown Class'
            }));
            setAttendanceRecords(records);
          } else {
            console.warn('Records data is not an array:', recordsData);
            setAttendanceRecords([]);
          }
        } else {
          console.warn('API response not successful:', response);
          setAttendanceRecords([]);
        }
      } catch (err: any) {
        console.error('Failed to fetch attendance data:', err);
        setError(err.message || 'Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [studentId]);

  const getRecordForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return attendanceRecords.find(record => record.date === dateStr);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return <CheckCircle className="w-4 h-4 text-success" />;
      case "absent": return <XCircle className="w-4 h-4 text-danger" />;
      case "late": return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "excused": return <Clock className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      present: "default",
      absent: "destructive", 
      late: "secondary",
      excused: "outline"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const selectedRecord = selectedDate ? getRecordForDate(selectedDate) : null;

  // Create modifiers for calendar styling
  const calendarModifiers = {
    present: attendanceRecords
      .filter(r => r.status === "present")
      .map(r => parseISO(r.date)),
    absent: attendanceRecords
      .filter(r => r.status === "absent") 
      .map(r => parseISO(r.date)),
    late: attendanceRecords
      .filter(r => r.status === "late")
      .map(r => parseISO(r.date)),
    excused: attendanceRecords
      .filter(r => r.status === "excused")
      .map(r => parseISO(r.date)),
  };

  const modifiersStyles = {
    present: { 
      backgroundColor: "hsl(var(--success))",
      color: "hsl(var(--success-foreground))",
      borderRadius: "4px"
    },
    absent: {
      backgroundColor: "hsl(var(--danger))",
      color: "hsl(var(--danger-foreground))",
      borderRadius: "4px"
    },
    late: {
      backgroundColor: "hsl(var(--warning))",
      color: "hsl(var(--warning-foreground))",
      borderRadius: "4px"
    },
    excused: {
      backgroundColor: "hsl(var(--blue))",
      color: "hsl(var(--blue-foreground))",
      borderRadius: "4px"
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Attendance Calendar</h2>
          <p className="text-muted-foreground">View your child's daily attendance records</p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            onClick={() => setViewMode("calendar")}
            size="sm"
          >
            Calendar View
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
            size="sm"
          >
            List View
          </Button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2 shadow-design-md border-0">
            <CardHeader>
              <CardTitle>{selectedDate ? format(selectedDate, "MMMM yyyy") : format(new Date(), "MMMM yyyy")}</CardTitle>
              <CardDescription>Click on any date to view attendance details</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading attendance data...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8 text-destructive">
                  <XCircle className="w-6 h-6 mr-2" />
                  <span>{error}</span>
                </div>
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={calendarModifiers}
                  modifiersStyles={modifiersStyles}
                  className="rounded-md border w-full"
                />
              )}
              
              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-success rounded"></div>
                  <span>Present</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-danger rounded"></div>
                  <span>Absent</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-warning rounded"></div>
                  <span>Late</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Excused</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          <Card className="shadow-design-md border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Day Details</span>
              </CardTitle>
              <CardDescription>
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedRecord ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    {getStatusBadge(selectedRecord.status)}
                  </div>
                  
                  {selectedRecord.timeIn && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Time In</span>
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {selectedRecord.timeIn}
                      </span>
                    </div>
                  )}
                  
                  {selectedRecord.timeOut && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Time Out</span>
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {selectedRecord.timeOut}
                      </span>
                    </div>
                  )}
                  
                  {selectedRecord.reason && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Reason</span>
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {selectedRecord.reason}
                      </p>
                    </div>
                  )}
                  
                  {selectedRecord.notes && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Additional Notes</span>
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {selectedRecord.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedDate && isToday(selectedDate) ? (
                    <div>
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Today's attendance is being recorded</p>
                    </div>
                  ) : (
                    <div>
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No attendance record for this date</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card className="shadow-design-md border-0">
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>Complete list of attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceRecords.map((record, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-design-sm transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(record.status)}
                    <div>
                      <p className="font-medium">{format(parseISO(record.date), "EEEE, MMMM d, yyyy")}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {record.timeIn && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            In: {record.timeIn}
                          </span>
                        )}
                        {record.timeOut && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Out: {record.timeOut}
                          </span>
                        )}
                      </div>
                      {record.reason && (
                        <p className="text-sm text-muted-foreground mt-1">{record.reason}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(record.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}