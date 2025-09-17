import { useEffect, useMemo, useState } from "react";
import { SchoolAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type AttendanceRecord = {
  _id: string;
  studentId: string;
  student?: { name?: string; rollNo?: string; className?: string };
  classId: string;
  className?: string;
  status: "present" | "absent" | "late";
  date: string;
  notes?: string;
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const singleDate = startDate && startDate === endDate ? startDate : undefined;
        const res = await SchoolAPI.getAttendance({
          ...(singleDate ? { date: singleDate } : {}),
          ...(classFilter ? { classId: classFilter } : {}),
        } as any);
        setRecords(((res as any).data as any) || []);
      } catch (e: any) {
        console.error("Attendance fetch failed:", e);
        setError(e?.message || "Failed to fetch attendance");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classFilter, statusFilter, startDate, endDate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter(r => {
      if (!q) return true;
      const name = r.student?.name?.toLowerCase() || "";
      const roll = r.student?.rollNo?.toLowerCase() || "";
      const cls = (r.className || "").toLowerCase();
      return name.includes(q) || roll.includes(q) || cls.includes(q);
    });
  }, [records, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Attendance</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Track & monitor attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label>Search student / roll / class</Label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. John, 10A, 23" />
            </div>
            <div className="space-y-1">
              <Label>Class</Label>
              <Input value={classFilter} onChange={(e) => setClassFilter(e.target.value)} placeholder="Class ID or name" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select className="border rounded h-9 px-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => { /* trigger useEffect by setting state to same value */ setEndDate(endDate); }} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Student ID</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{(r as any).studentId?.name || r.studentId}</td>
                    <td className="px-3 py-2">{(r as any).studentId?.studentId || "-"}</td>
                    <td className="px-3 py-2">{(r as any).classId?.name ? `${(r as any).classId?.grade || ''}${(r as any).classId?.section || ''} ${(r as any).classId?.name}`.trim() : r.classId}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${r.status === 'present' ? 'bg-green-100 text-green-700' : r.status === 'late' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2">{r.notes || ""}</td>
                  </tr>
                ))}
                {error && !loading && (
                  <tr>
                    <td className="px-3 py-6 text-center text-red-600" colSpan={6}>{error}</td>
                  </tr>
                )}
                {!error && !loading && filtered.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>No attendance records</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>Loading records…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


