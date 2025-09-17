import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Routes, Route, Navigate } from "react-router-dom";
import Students from "./Students";
import ClassesPage from "./Classes";
import { TeacherManagement } from "@/components/teachers/TeacherManagement";
import { apiRequest } from "@/lib/api";

const Index = () => {
  const [user, setUser] = useState<{name: string; email: string; role: string} | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await apiRequest<{ success: boolean; user: any }>("/auth/me");
        if (me?.user) {
          const u = me.user;
          setUser({
            name: u.profile?.name || u.username?.split('@')[0] || 'User',
            email: u.profile?.contact?.email || u.username,
            role: u.role
          });
          try { localStorage.setItem('user', JSON.stringify(u)); } catch {}
        }
      } catch {}
    };
    load();
  }, []);
  // Index page now assumes authenticated; App.tsx handles login routing
  const handleLogout = () => {
    setUser(null);
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch {}
    window.location.href = "/login";
  };

  return (
    <MainLayout user={user || undefined} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/attendance" element={<div className="p-8 text-center text-muted-foreground">Attendance management coming soon...</div>} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/teachers" element={<TeacherManagement />} />
        <Route path="/reports" element={<div className="p-8 text-center text-muted-foreground">Reports & analytics coming soon...</div>} />
        <Route path="/communication" element={<div className="p-8 text-center text-muted-foreground">Communication hub coming soon...</div>} />
        <Route path="/notifications" element={<div className="p-8 text-center text-muted-foreground">Notifications management coming soon...</div>} />
        <Route path="/settings" element={<div className="p-8 text-center text-muted-foreground">System settings coming soon...</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
};

export default Index;
