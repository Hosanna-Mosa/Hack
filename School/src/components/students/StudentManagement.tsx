import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  Download,
  Upload
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Mock student data
// TODO: replace mock with live fetch (done below); keep as fallback
const mockStudents = [
  {
    id: 1,
    name: "Alice Johnson",
    studentId: "STU001",
    grade: "Grade 7",
    section: "A",
    age: 13,
    email: "alice.johnson@student.edu",
    phone: "+1 234-567-8901",
    guardianName: "Robert Johnson",
    guardianPhone: "+1 234-567-8900",
    address: "123 Oak Street, Springfield",
    attendanceRate: 96.5,
    status: "Active",
    enrollmentDate: "2024-01-15"
  },
  {
    id: 2,
    name: "Marcus Chen",
    studentId: "STU002", 
    grade: "Grade 8",
    section: "B",
    age: 14,
    email: "marcus.chen@student.edu",
    phone: "+1 234-567-8902",
    guardianName: "Lisa Chen",
    guardianPhone: "+1 234-567-8903",
    address: "456 Pine Avenue, Springfield",
    attendanceRate: 98.2,
    status: "Active",
    enrollmentDate: "2024-01-10"
  },
  {
    id: 3,
    name: "Sophie Williams",
    studentId: "STU003",
    grade: "Grade 6",
    section: "A", 
    age: 12,
    email: "sophie.williams@student.edu",
    phone: "+1 234-567-8904",
    guardianName: "Emma Williams",
    guardianPhone: "+1 234-567-8905",
    address: "789 Maple Drive, Springfield",
    attendanceRate: 94.1,
    status: "Active",
    enrollmentDate: "2024-02-01"
  },
  {
    id: 4,
    name: "David Rodriguez",
    studentId: "STU004",
    grade: "Grade 9",
    section: "C",
    age: 15,
    email: "david.rodriguez@student.edu", 
    phone: "+1 234-567-8906",
    guardianName: "Maria Rodriguez",
    guardianPhone: "+1 234-567-8907",
    address: "321 Elm Street, Springfield",
    attendanceRate: 91.8,
    status: "Active",
    enrollmentDate: "2023-12-15"
  },
  {
    id: 5,
    name: "Emma Thompson",
    studentId: "STU005",
    grade: "Grade 7",
    section: "B",
    age: 13,
    email: "emma.thompson@student.edu",
    phone: "+1 234-567-8908",
    guardianName: "James Thompson",
    guardianPhone: "+1 234-567-8909",
    address: "654 Cedar Lane, Springfield",
    attendanceRate: 97.3,
    status: "Active",
    enrollmentDate: "2024-01-20"
  }
];

export function StudentManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const filteredStudents = students.filter((student: any) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGrade = selectedGrade === "all" || student.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });
  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return "text-success";
    if (rate >= 90) return "text-warning"; 
    return "text-destructive";
  };
  const getAttendanceBadge = (rate: number) => {
    if (rate >= 95) return "bg-success-soft text-success";
    if (rate >= 90) return "bg-warning-soft text-warning";
    return "bg-destructive-soft text-destructive";
  };
  // Minimal form state mapping important fields from schema (simplified)
  const [form, setForm] = useState({
    studentId: "",
    name: "",
    dateOfBirth: "",
    admissionNumber: "",
    parent: { name: "", email: "", mobile: "" }
  });

  const submitNewStudent = async () => {
    if (!form.studentId || !form.name || !form.dateOfBirth || !form.parent.name || !form.parent.mobile) {
      toast({ title: "Missing fields", description: "Please fill all required fields." });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        studentId: form.studentId,
        name: form.name,
        dateOfBirth: form.dateOfBirth,
        academicInfo: { admissionDate: new Date().toISOString(), admissionNumber: form.admissionNumber || form.studentId },
        parentIds: [],
        parents: [ { name: form.parent.name, email: form.parent.email || null, mobile: form.parent.mobile, password: 'parent123' } ]
      };
      await apiRequest(`/students`, { method: 'POST', body: JSON.stringify(payload) });
      toast({ title: "Student added", description: form.name });
      setAddOpen(false);
      setForm({ studentId: "", name: "", dateOfBirth: "", admissionNumber: "", parent: { name: "", email: "", mobile: "" } });
    } catch (e: any) {
      toast({ title: "Failed to add", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  // Load students from backend based on schoolId
  useEffect(() => {
    const load = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const sid = user?.schoolId;
        const path = sid ? `/students?schoolId=${sid}` : `/students`;
        const res = await apiRequest<{ success: boolean; data: any[] }>(path);
        const normalized = (res.data || []).map((s: any) => ({
          name: s.name || s.profile?.name || 'Unnamed',
          studentId: s.studentId || '',
          grade: s.classId?.grade ? `Grade ${s.classId.grade}` : (s.classId?.name || 'Unassigned'),
          section: s.classId?.section || '',
          email: s.contactInfo?.email || '',
          guardianName: '',
          guardianPhone: '',
          attendanceRate: 0,
          status: s.isActive ? 'Active' : 'Inactive'
        }));
        setStudents(normalized);
      } catch {
        // fallback to mock if fetch fails
        setStudents(mockStudents as any);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-card-foreground">Student Management</h1>
          <p className="text-muted-foreground">Manage student profiles and information</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button className="gap-2 gradient-primary text-white" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Student ID</label>
                <Input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value.toUpperCase() })} placeholder="e.g., STU123" />
              </div>
              <div>
                <label className="text-sm">Admission Number</label>
                <Input value={form.admissionNumber} onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })} placeholder="e.g., ADM123" />
              </div>
            </div>
            <div>
              <label className="text-sm">Full Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter student name" />
            </div>
            <div>
              <label className="text-sm">Date of Birth</label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>

            <div className="pt-2 border-t">
              <div className="font-medium">Parent Details</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm">Parent Name</label>
                <Input value={form.parent.name} onChange={(e) => setForm({ ...form, parent: { ...form.parent, name: e.target.value } })} />
              </div>
              <div>
                <label className="text-sm">Email (optional)</label>
                <Input type="email" value={form.parent.email} onChange={(e) => setForm({ ...form, parent: { ...form.parent, email: e.target.value } })} />
              </div>
              <div>
                <label className="text-sm">Mobile</label>
                <Input value={form.parent.mobile} onChange={(e) => setForm({ ...form, parent: { ...form.parent, mobile: e.target.value } })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitNewStudent} disabled={saving}>{saving ? 'Saving...' : 'Add Student'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold">{students.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                <p className="text-3xl font-bold">{students.filter(s => s.status === "Active").length}</p>
              </div>
              <div className="w-8 h-8 bg-success-soft rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
                <p className="text-3xl font-bold">
                  {(students.reduce((acc, s) => acc + s.attendanceRate, 0) / students.length).toFixed(1)}%
                </p>
              </div>
              <div className="w-8 h-8 bg-accent-soft rounded-full flex items-center justify-center">
                <Badge className="w-4 h-4 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                <p className="text-3xl font-bold">3</p>
              </div>
              <div className="w-8 h-8 bg-secondary-soft rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search & Filter Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, student ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="all">All Grades</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
              </select>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
          <CardDescription>
            {searchQuery && `Showing results for "${searchQuery}"`}
            {selectedGrade !== "all" && ` in ${selectedGrade}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Guardian</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Attendance</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-2">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">{student.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-2 font-mono text-sm">{student.studentId}</td>
                    <td className="py-4 px-2">
                      <Badge variant="outline" className="text-xs">
                        {student.grade} - {student.section}
                      </Badge>
                    </td>
                    <td className="py-4 px-2">
                      <div>
                        <div className="font-medium text-sm">{student.guardianName}</div>
                        <div className="text-xs text-muted-foreground">{student.guardianPhone}</div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <Badge className={`text-xs ${getAttendanceBadge(student.attendanceRate)}`}>
                        {student.attendanceRate}%
                      </Badge>
                    </td>
                    <td className="py-4 px-2">
                      <Badge variant="outline" className="text-xs bg-success-soft text-success">
                        {student.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="w-4 h-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Edit3 className="w-4 h-4" />
                            Edit Student
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive">
                            <Trash2 className="w-4 h-4" />
                            Remove Student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? `No students match your search for "${searchQuery}"`
                  : "No students have been added yet"
                }
              </p>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add First Student
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}