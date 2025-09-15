import { useState } from "react";
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
  FileText
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";

interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "late";
  timeIn?: string;
  timeOut?: string;
  notes?: string;
  reason?: string;
}

export function AttendanceCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Mock attendance data - would come from API
  const attendanceRecords: AttendanceRecord[] = [
    { date: "2024-01-15", status: "present", timeIn: "8:15 AM", timeOut: "3:30 PM" },
    { date: "2024-01-14", status: "late", timeIn: "8:45 AM", timeOut: "3:30 PM", reason: "Traffic delay" },
    { date: "2024-01-13", status: "present", timeIn: "8:10 AM", timeOut: "3:30 PM" },
    { date: "2024-01-12", status: "absent", reason: "Sick with fever", notes: "Doctor's note provided" },
    { date: "2024-01-11", status: "present", timeIn: "8:05 AM", timeOut: "3:30 PM" },
    { date: "2024-01-10", status: "present", timeIn: "8:20 AM", timeOut: "3:30 PM" },
    { date: "2024-01-09", status: "late", timeIn: "8:50 AM", timeOut: "3:30 PM", reason: "Medical appointment" },
    { date: "2024-01-08", status: "present", timeIn: "8:12 AM", timeOut: "3:30 PM" },
  ];

  const getRecordForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return attendanceRecords.find(record => record.date === dateStr);
  };

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
              <CardTitle>January 2024</CardTitle>
              <CardDescription>Click on any date to view attendance details</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={calendarModifiers}
                modifiersStyles={modifiersStyles}
                className="rounded-md border w-full"
              />
              
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