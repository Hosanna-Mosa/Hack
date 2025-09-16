import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useEffect, useMemo, useState } from "react";
import { LoginPage } from "@/components/auth/LoginPage";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{name: string; email: string; role: string} | null>(null);

  // Persist session across reloads if a token exists
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) setIsAuthenticated(true);
    } catch {}
  }, []);

  const handleLogin = (email: string, _password: string, role: string) => {
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

  const isAuthed = useMemo(() => {
    try { return isAuthenticated || Boolean(localStorage.getItem('token')); } catch { return isAuthenticated; }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} startOnSignup={false} />} />
            <Route path="/signup" element={<LoginPage onLogin={handleLogin} startOnSignup={true} />} />
            <Route path="/*" element={isAuthed ? <Index /> : <Navigate to="/login" replace />} />
            <Route path="/404" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
