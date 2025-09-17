import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SchoolAPI } from "@/lib/api";

type Stat = { _id: string; count: number };

export default function ReportsPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stat[]>([]);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    setStartDate(first);
    setEndDate(last);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      // Build query params without undefined values
      const params: any = { startDate, endDate };
      if (classId && classId.trim()) {
        params.classId = classId.trim();
      }
      
      console.log('Fetching stats with params:', params);
      const res = await SchoolAPI.getAttendanceStats(params);
      console.log('Stats response:', res.data);
      const d = (res.data as any) || { stats: [], total: 0 };
      setStats(d.stats || []);
      setTotal(d.total || 0);
      
      // Fallback: if stats endpoint returns empty, try fetching today's attendance records
      if ((d.stats || []).length === 0 && d.total === 0) {
        console.log('Stats empty, trying attendance records...');
        try {
          const todayStr = new Date().toISOString().slice(0, 10);
          const attendanceRes = await SchoolAPI.getAttendance({ date: todayStr });
          const records = (attendanceRes.data as any[]) || [];
          console.log('Today attendance records:', records);
          
          // Calculate stats from records
          const present = records.filter(r => r.status === 'present').length;
          const late = records.filter(r => r.status === 'late').length;
          const absent = records.filter(r => r.status === 'absent' || r.status === 'excused').length;
          const total = records.length;
          
          setStats([
            { _id: 'present', count: present },
            { _id: 'late', count: late },
            { _id: 'absent', count: absent }
          ]);
          setTotal(total);
        } catch (fallbackError) {
          console.error('Fallback failed:', fallbackError);
          // Last resort: try without any filters
          try {
            console.log('Trying without filters...');
            const attendanceRes = await SchoolAPI.getAttendance({});
            const records = (attendanceRes.data as any[]) || [];
            console.log('All attendance records:', records);
            
            const present = records.filter(r => r.status === 'present').length;
            const late = records.filter(r => r.status === 'late').length;
            const absent = records.filter(r => r.status === 'absent' || r.status === 'excused').length;
            const total = records.length;
            
            setStats([
              { _id: 'present', count: present },
              { _id: 'late', count: late },
              { _id: 'absent', count: absent }
            ]);
            setTotal(total);
          } catch (finalError) {
            console.error('Final fallback failed:', finalError);
          }
        }
      }
    } catch (e) {
      console.error('Stats fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (startDate && endDate) load(); }, [startDate, endDate, classId]);

  const present = stats.find(s => s._id === 'present')?.count || 0;
  const late = stats.find(s => s._id === 'late')?.count || 0;
  const absent = (stats.find(s => s._id === 'absent')?.count || 0) + (stats.find(s => s._id === 'excused')?.count || 0);
  const rate = useMemo(() => total ? ((present / total) * 100).toFixed(1) : '0.0', [present, total]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics & filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Class</Label>
              <Input placeholder="Optional classId" value={classId} onChange={(e) => setClassId(e.target.value)} />
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end"><Button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2">
            <Card className="metric-card gradient-primary text-white">
              <CardHeader className="pb-2"><CardTitle className="text-white text-base">Attendance Rate</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{rate}%</div>
                <div className="text-white/80 text-sm">{present} of {total} present</div>
              </CardContent>
            </Card>
            <Card className="metric-card"><CardHeader className="pb-2"><CardTitle>Present</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{present}</div></CardContent></Card>
            <Card className="metric-card"><CardHeader className="pb-2"><CardTitle>Late</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{late}</div></CardContent></Card>
            <Card className="metric-card"><CardHeader className="pb-2"><CardTitle>Absent</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{absent}</div></CardContent></Card>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Count</th>
                  <th className="px-3 py-2">Share</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s._id} className="border-t">
                    <td className="px-3 py-2 capitalize">{s._id}</td>
                    <td className="px-3 py-2">{s.count}</td>
                    <td className="px-3 py-2">{total ? ((s.count / total) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>
                ))}
                {!loading && stats.length === 0 && (
                  <tr><td className="px-3 py-6 text-center text-muted-foreground" colSpan={3}>No data for selected range</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


