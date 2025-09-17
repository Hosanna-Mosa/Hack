import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, School, Lock, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/parent-portal-hero.jpg";

interface LoginFormProps {
  onLogin: (credentials: { mobile: string; password: string }) => void;
  isLoading?: boolean;
}

export function LoginForm({ onLogin, isLoading = false }: LoginFormProps) {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mobile || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both mobile number and password.",
        variant: "destructive",
      });
      return;
    }

    onLogin({ mobile, password });
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex">
      {/* Hero Image Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img 
          src={heroImage} 
          alt="Parents and children in school environment"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-hero/20 backdrop-blur-[1px]"></div>
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-3xl font-bold mb-2">Stay Connected</h2>
            <p className="text-lg opacity-90">
              Monitor your child's attendance, communicate with teachers, and stay updated with school activities.
            </p>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-design-lg">
            <School className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Parent Portal</h1>
          <p className="text-muted-foreground">
            Access your child's attendance records securely
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-design-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
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
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <Button
                type="submit" 
                variant="hero"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary-dark transition-colors"
                  onClick={() => toast({
                    title: "Forgot Password",
                    description: "Please contact your school administrator for password reset assistance.",
                  })}
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>For technical support, contact your school administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}