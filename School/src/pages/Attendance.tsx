import { useEffect, useMemo, useState } from "react";
import { SchoolAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [granularity, setGranularity] = useState<'day' | 'month'>('day');

  function downloadMonthlyCSV() {
    if (!selectedDate || granularity !== 'month') return;
    // Filter to selected month just in case
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    const monthRecords = activeRecords.filter((r) => {
      const d = new Date(r.date as any);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const header = [
      'Date',
      'Student Name',
      'Student ID',
      'Class',
      'Status',
      'Notes'
    ];
    const rows = monthRecords.map((r) => {
      const studentObj: any = (r as any).studentId || {};
      const classObj: any = (r as any).classId || {};
      const className: string = (
        classObj?.name
          ? `${classObj.grade || ''}${classObj.section || ''} ${classObj.name}`.trim()
          : (r as any).className || classObj?.code || classObj?._id || ''
      );
      return [
        new Date(r.date as any).toLocaleDateString(),
        studentObj.name || '',
        studentObj.studentId || studentObj.rollNo || '',
        className,
        r.status,
        r.notes || ''
      ].map((cell) => {
        const s = String(cell ?? '');
        // Escape quotes and wrap if contains comma/newline
        const escaped = s.replace(/"/g, '""');
        return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `attendance_${y}-${String(m + 1).padStart(2, '0')}.csv`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        let params: any = {};
        if (selectedDate) {
          if (granularity === 'day') {
            params.date = format(selectedDate, 'yyyy-MM-dd');
          } else {
            const y = selectedDate.getFullYear();
            const m = selectedDate.getMonth();
            const first = new Date(y, m, 1);
            const last = new Date(y, m + 1, 0);
            params.startDate = format(first, 'yyyy-MM-dd');
            params.endDate = format(last, 'yyyy-MM-dd');
          }
        } else if (startDate && endDate) {
          if (startDate === endDate) params.date = startDate; else { params.startDate = startDate; params.endDate = endDate; }
        }
        // Only send classId if it looks like a backend ID (24-hex MongoId)
        if (classFilter && /^[a-fA-F0-9]{24}$/.test(classFilter.trim())) {
          params.classId = classFilter.trim();
        }
        const res = await SchoolAPI.getAttendance(params);
        setRecords(((res as any).data as any) || []);
      } catch (e: any) {
        console.error("Attendance fetch failed:", e);
        setError(e?.message || "Failed to fetch attendance");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classFilter, statusFilter, startDate, endDate, selectedDate, granularity]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const classQuery = classFilter.trim().toLowerCase();
    return records.filter((r) => {
      // Status filter
      if (statusFilter && r.status !== (statusFilter as any)) return false;

      if (!q) return true;
      const studentObj: any = (r as any).studentId || {};
      const classObj: any = (r as any).classId || {};
      const name: string = (studentObj.name || "").toLowerCase();
      const roll: string = (studentObj.studentId || studentObj.rollNo || "").toLowerCase();
      const className: string = (
        classObj?.name
          ? `${classObj.grade || ''}${classObj.section || ''} ${classObj.name}`.trim()
          : r.className || classObj?.code || classObj?._id || ''
      ).toLowerCase();
      const matchesSearch = name.includes(q) || roll.includes(q) || className.includes(q);
      const matchesClass = classQuery
        ? (className.includes(classQuery) || String(classObj?._id || '').toLowerCase() === classQuery)
        : true;
      return matchesSearch && matchesClass;
    });
  }, [records, query, statusFilter, classFilter]);

  // Use filtered records when query/status filter active, otherwise full set
  const activeRecords = filtered;

  // Aggregate to classes for selected date
  const classesForDate = useMemo(() => {
    if (!selectedDate) return [] as { classId: string; className: string; total: number; present: number; absent: number; late: number }[];
    const map = new Map<string, { classId: string; className: string; total: number; present: number; absent: number; late: number }>();
    const classQuery = classFilter.trim().toLowerCase();
    for (const r of activeRecords) {
      const cid = (r as any).classId?._id || r.classId;
      const cname = (r as any).classId?.name ? `${(r as any).classId?.grade || ''}${(r as any).classId?.section || ''} ${(r as any).classId?.name}`.trim() : (r.className || cid);
      const cnameLower = cname.toLowerCase();
      if (classQuery && !(cnameLower.includes(classQuery) || String(cid).toLowerCase() === classQuery)) continue;
      if (!map.has(cid)) map.set(cid, { classId: cid, className: cname, total: 0, present: 0, absent: 0, late: 0 });
      const entry = map.get(cid)!;
      entry.total += 1;
      if (r.status === 'present') entry.present += 1; else if (r.status === 'absent') entry.absent += 1; else entry.late += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className));
  }, [activeRecords, selectedDate, classFilter]);

  const studentsForSelection = useMemo(() => {
    if (!selectedClassId) return [] as AttendanceRecord[];
    return activeRecords.filter(r => (((r as any).classId?._id || r.classId) === selectedClassId));
  }, [activeRecords, selectedClassId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Attendance</h1>
        <Button
          onClick={downloadMonthlyCSV}
          disabled={!selectedDate || granularity !== 'month' || loading || activeRecords.length === 0}
          variant="outline"
        >
          Download monthly CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Track & monitor attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Label className="mb-2 block">Pick a date</Label>
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
            </div>
            <div className="lg:col-span-2 space-y-4">
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
                <Button onClick={() => { setEndDate(endDate); }} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
              </div>
            </div>
          </div>

          {/* Drilldown: date -> classes -> students */}
          {selectedDate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">
                  {granularity === 'day' ? 'Classes on ' : 'Classes in '}
                  {granularity === 'day' ? format(selectedDate, 'PPP') : format(selectedDate, 'LLLL yyyy')}
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">View:</span>
                  <select className="border rounded h-9 px-2" value={granularity} onChange={(e) => { setGranularity(e.target.value as 'day' | 'month'); setSelectedClassId(''); }}>
                    <option value="day">Daywise</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {classesForDate.map(cls => (
                  <div key={cls.classId} className={`border rounded p-3 cursor-pointer ${selectedClassId === cls.classId ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedClassId(cls.classId)}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{cls.className}</div>
                      <div className="text-xs text-muted-foreground">{cls.total} marked</div>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">P {cls.present}</span>
                      <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">L {cls.late}</span>
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">A {cls.absent}</span>
                    </div>
                  </div>
                ))}
                {classesForDate.length === 0 && (
                  <div className="text-sm text-muted-foreground">No attendance for selected date.</div>
                )}
              </div>

              {selectedClassId && (
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">Students for selected class</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-3 py-2">Student</th>
                          <th className="px-3 py-2">Student ID</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsForSelection.map((r) => (
                          <tr key={r._id} className="border-t">
                            <td className="px-3 py-2">{(r as any).studentId?.name || r.studentId}</td>
                            <td className="px-3 py-2">{(r as any).studentId?.studentId || "-"}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${r.status === 'present' ? 'bg-green-100 text-green-700' : r.status === 'late' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                            </td>
                            <td className="px-3 py-2">{r.notes || ""}</td>
                          </tr>
                        ))}
                        {studentsForSelection.length === 0 && (
                          <tr>
                            <td className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>No students for this class/date</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
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
                {activeRecords.map((r) => (
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


