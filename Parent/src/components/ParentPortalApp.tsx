import { useState, useEffect } from "react";
import { LoginForm } from "./auth/LoginForm";
import { ParentDashboard } from "./dashboard/ParentDashboard";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  name: string;
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
      // Simulate API call - in real app, this would be an actual authentication API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock authentication logic
      if (credentials.email && credentials.password) {
        const mockUser: User = {
          id: "1",
          email: credentials.email,
          name: "Sarah Johnson" // Mock parent name
        };
        
        setUser(mockUser);
        localStorage.setItem("parentPortalUser", JSON.stringify(mockUser));
        
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in to the Parent Portal.",
        });
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      toast({
        title: "Sign In Failed",
        description: "Please check your email and password and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("parentPortalUser");
    
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