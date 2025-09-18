import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { AddTeacherDialog } from "./AddTeacherDialog";
import { Button } from "@/components/ui/button";
import { Edit3, MoreHorizontal, Trash2 } from "lucide-react";
import { EditTeacherDialog } from "./EditTeacherDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeacherRow {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
}

export function TeacherManagement() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [user, setUser] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherRow | null>(null);

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
                  <div className="flex items-center gap-2">
                    {user?.role === 'admin' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => { setEditing(t); setEditOpen(true); }}>
                            <Edit3 className="w-4 h-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={async () => {
                            try {
                              await apiRequest(`/teachers/${t._id}?hard=true`, { method: 'DELETE' });
                              await loadTeachers();
                            } catch {}
                          }}>
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Badge variant="outline">Active</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditTeacherDialog
        open={editOpen}
        onOpenChange={(v) => { setEditOpen(v); if (!v) setEditing(null); }}
        teacher={editing}
        onSaved={loadTeachers}
      />
    </div>
  );
}


