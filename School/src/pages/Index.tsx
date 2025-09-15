import { useState } from "react";
import { LoginPage } from "@/components/auth/LoginPage";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Students from "./Students";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{name: string; email: string; role: string} | null>(null);

  const handleLogin = (email: string, password: string, role: string) => {
    // Mock authentication - in real app this would call backend
    setUser({
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email,
      role
    });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <MainLayout user={user || undefined} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/attendance" element={<div className="p-8 text-center text-muted-foreground">Attendance management coming soon...</div>} />
        <Route path="/classes" element={<div className="p-8 text-center text-muted-foreground">Class management coming soon...</div>} />
        <Route path="/teachers" element={<div className="p-8 text-center text-muted-foreground">Teacher management coming soon...</div>} />
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
