import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/utils";
import { AddTeacherDialog } from "./AddTeacherDialog";

interface TeacherRow {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
}

export function TeacherManagement() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
  }, []);

  const loadTeachers = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const sid = user?.schoolId;
      const res = await apiRequest<{ success: boolean; data: any[] }>(`/teachers?schoolId=${sid}`);
      const rows: TeacherRow[] = (res.data || []).map((t: any) => ({
        _id: t._id,
        name: t.user?.profile?.name || 'Unnamed',
        email: t.user?.profile?.contact?.email || '',
        mobile: t.user?.profile?.contact?.phone || ''
      }));
      setTeachers(rows);
    } catch {
      setTeachers([]);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Teachers</h1>
        {user?.role === 'admin' && (
          <AddTeacherDialog onTeacherAdded={loadTeachers} />
        )}
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
                    {t.mobile && (
                      <div className="text-sm text-muted-foreground">{t.mobile}</div>
                    )}
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


