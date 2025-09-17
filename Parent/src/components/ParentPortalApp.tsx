import { useState, useEffect } from "react";
import { LoginForm } from "./auth/LoginForm";
import { ParentDashboard } from "./dashboard/ParentDashboard";
import { PasswordChangeDialog } from "./auth/PasswordChangeDialog";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  mobile: string;
  name: string;
  email?: string;
  isDefaultPassword?: boolean;
  studentIds?: string[];
}

interface Student {
  _id: string;
  name: string;
  studentId: string;
  classId?: {
    _id: string;
    name: string;
    grade: string;
    section: string;
  };
  photoUrl?: string;
  dateOfBirth?: string;
  academicInfo?: {
    admissionDate: string;
    admissionNumber: string;
    currentGrade: string;
    currentSection: string;
  };
  contactInfo?: {
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
}

export function ParentPortalApp() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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

  const handleLogin = async (credentials: { mobile: string; password: string }) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/parents/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.success) {
        const userData: User = {
          id: data.parent._id,
          mobile: data.parent.mobile,
          name: data.parent.name,
          email: data.parent.email,
          isDefaultPassword: data.parent.isDefaultPassword,
          studentIds: data.parent.studentIds
        };
        
        setUser(userData);
        localStorage.setItem("parentPortalUser", JSON.stringify(userData));
        localStorage.setItem("parentToken", data.token);
        
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in to the Parent Portal.",
        });

        // Check if user needs to change password
        if (data.parent.isDefaultPassword) {
          setShowPasswordChangeDialog(true);
        }
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Please check your mobile number and password and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("parentPortalUser");
    localStorage.removeItem("parentToken");
    
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  };

  const handlePasswordChange = async (newPassword: string, confirmPassword: string) => {
    setIsChangingPassword(true);
    
    try {
      const token = localStorage.getItem("parentToken");
      const response = await fetch('http://localhost:5000/api/parents/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password change failed');
      }

      if (data.success) {
        toast({
          title: "Password Changed",
          description: "Your password has been changed successfully.",
        });
        
        // Update user data to reflect password change
        if (user) {
          const updatedUser = { ...user, isDefaultPassword: false };
          setUser(updatedUser);
          localStorage.setItem("parentPortalUser", JSON.stringify(updatedUser));
        }
        
        setShowPasswordChangeDialog(false);
      } else {
        throw new Error(data.message || 'Password change failed');
      }
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to prevent dialog from closing
    } finally {
      setIsChangingPassword(false);
    }
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
      
      <PasswordChangeDialog
        isOpen={showPasswordChangeDialog}
        onClose={() => setShowPasswordChangeDialog(false)}
        onChangePassword={handlePasswordChange}
        isLoading={isChangingPassword}
      />
    </>
  );
}