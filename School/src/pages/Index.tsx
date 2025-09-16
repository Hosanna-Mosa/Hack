import { useEffect, useState } from "react";
import { LoginPage } from "@/components/auth/LoginPage";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Students from "./Students";
import { apiRequest } from "@/lib/utils";
import { SignupPage } from "@/components/auth/SignupPage";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{name: string; email: string; role: string} | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('schoolUser');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (email: string, password: string, role: string) => {
    const resp = await apiRequest<{ success: boolean; token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: email, password })
    });
    localStorage.setItem('authToken', resp.token);
    localStorage.setItem('schoolUser', JSON.stringify(resp.user));
    setUser(resp.user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('schoolUser');
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="absolute right-4 top-4 text-sm">
          <Link to="/signup" className="text-primary">Create account</Link>
        </div>
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <MainLayout user={user || undefined} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/signup" element={<SignupPage />} />
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
