import { useState, useEffect } from "react";
import { LoginForm } from "./auth/LoginForm";
import { ParentDashboard } from "./dashboard/ParentDashboard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/utils";

interface User {
  _id: string;
  username: string;
  role: string;
  profile?: { name?: string; contact?: { email?: string } };
}

export function ParentPortalApp() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const { toast } = useToast();

  // Check for existing session on app load
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const savedUser = localStorage.getItem("parentPortalUser");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error("Error checking existing session:", error);
        localStorage.removeItem("parentPortalUser");
      } finally {
        setIsInitializing(false);
      }
    };

    checkExistingSession();
  }, []);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const resp = await apiRequest<{ success: boolean; token: string; user: User }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ username: credentials.email, password: credentials.password })
        }
      );

      localStorage.setItem("authToken", resp.token);
      setUser(resp.user);
      localStorage.setItem("parentPortalUser", JSON.stringify(resp.user));

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in to the Parent Portal.",
      });
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error?.message || "Please check your email and password and try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("parentPortalUser");
    localStorage.removeItem("authToken");
    
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <div className="w-8 h-8 bg-primary-foreground rounded-full"></div>
          </div>
          <p className="text-muted-foreground">Loading Parent Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <ParentDashboard onLogout={handleLogout} />
      ) : (
        <LoginForm onLogin={handleLogin} isLoading={isLoading} />
      )}
    </>
  );
}