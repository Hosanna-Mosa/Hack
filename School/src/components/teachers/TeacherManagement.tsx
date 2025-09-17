import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/utils";

interface TeacherRow {
  _id: string;
  name: string;
  email?: string;
}

export function TeacherManagement() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const sid = user?.schoolId;
        const res = await apiRequest<{ success: boolean; data: any[] }>(`/classes/teachers?schoolId=${sid}`);
        const rows: TeacherRow[] = (res.data || []).map((t: any) => ({
          _id: t._id,
          name: t.user?.profile?.name || 'Unnamed',
          email: t.user?.profile?.contact?.email || ''
        }));
        setTeachers(rows);
      } catch {
        setTeachers([]);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Teachers</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teachers ({teachers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <div className="text-muted-foreground">No teachers found for this school.</div>
          ) : (
            <div className="grid gap-3">
              {teachers.map((t) => (
                <div key={t._id} className="border rounded-md p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.email}</div>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


