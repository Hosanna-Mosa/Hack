import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Lock, User, Eye, EyeOff } from "lucide-react";

interface LoginPageProps {
  onLogin: (email: string, password: string, role: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("admin");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onLogin(email, password, role);
    setIsLoading(false);
  };

  const demoAccounts = [
    { role: "admin", email: "admin@school.edu", label: "Administrator" },
    { role: "teacher", email: "teacher@school.edu", label: "Teacher" },
    { role: "staff", email: "staff@school.edu", label: "Staff Member" }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 gradient-hero opacity-10"></div>
      
      <Card className="w-full max-w-md relative z-10 shadow-educational">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">EduAdmin Portal</CardTitle>
          <CardDescription className="text-base">
            School Administration & Management System
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="admin">Administrator</option>
                <option value="teacher">Teacher</option>
                <option value="staff">Staff Member</option>
              </select>
            </div>

            <Button 
              type="submit" 
              className="w-full gradient-primary text-white font-medium py-6 text-base"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="space-y-3">
            <div className="text-center text-sm text-muted-foreground">
              Quick Demo Access
            </div>
            <div className="grid gap-2">
              {demoAccounts.map((account) => (
                <Button
                  key={account.role}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword("demo123");
                    setRole(account.role);
                  }}
                  className="justify-start text-xs"
                >
                  {account.label}: {account.email}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}