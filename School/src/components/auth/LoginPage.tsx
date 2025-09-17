import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Lock, User, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface LoginPageProps {
  onLogin: (email: string, password: string, role: string, token?: string) => void;
  startOnSignup?: boolean;
}

export function LoginPage({ onLogin, startOnSignup }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("admin");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(Boolean(startOnSignup));
  const [name, setName] = useState("");
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [schoolAdded, setSchoolAdded] = useState(false);
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    address: { street: "", city: "", state: "", zipCode: "", country: "India" },
    contactInfo: { phone: "", email: "", website: "" }
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  // Reset schoolAdded when role changes or switching between signup/login
  useEffect(() => {
    setSchoolAdded(false);
  }, [role, isSignup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignup) {
        const payload: any = {
          username: email, // backend expects username; we use email
          password,
          role: role === "staff" ? "admin" : role, // map UI option
          profile: {
            name: name || email.split("@")[0],
            contact: { email }
          }
        };
        if (role === "admin" && schoolForm.name) {
          payload.school = {
            name: schoolForm.name,
            address: {
              street: schoolForm.address.street,
              city: schoolForm.address.city,
              state: schoolForm.address.state,
              zipCode: schoolForm.address.zipCode,
              country: schoolForm.address.country || "India"
            },
            contactInfo: {
              phone: schoolForm.contactInfo.phone ? [schoolForm.contactInfo.phone] : [],
              email: schoolForm.contactInfo.email ? [schoolForm.contactInfo.email] : [],
              website: schoolForm.contactInfo.website || undefined
            }
          };
        }
        const res = await apiRequest<{ success: boolean; token: string; user: any }>(
          "/auth/register",
          { method: "POST", body: JSON.stringify(payload) }
        );
        toast({ title: "Account created", description: "Please sign in to continue." });
        navigate("/login", { replace: true });
      } else {
        const payload = { username: email, password, role };
        const res = await apiRequest<{ success: boolean; token: string; user: any }>(
          "/auth/login",
          { method: "POST", body: JSON.stringify(payload) }
        );
        const mappedRole = res.user?.role === "admin" ? "staff" : res.user?.role || role;
        onLogin(email, password, mappedRole, res.token);
        try {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user || {}));
        } catch {}
        toast({ title: "Welcome back", description: "Signed in successfully." });
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message || "Authentication failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { role: "admin", email: "admin@school.edu", label: "Administrator" },
    { role: "teacher", email: "teacher@school.edu", label: "Teacher" }
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
            {isSignup ? "Create an account to get started" : "School Administration & Management System"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
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
                {!isSignup && <option value="teacher">Teacher</option>}
              </select>
            </div>


            {isSignup && role === "admin" && (
              <div className="text-center">
                <Dialog open={schoolOpen} onOpenChange={setSchoolOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" type="button" className="w-full mb-4">
                      {schoolAdded ? "✓ School Added" : "Add New School"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                      <DialogTitle>Add New School</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                      <div className="space-y-2">
                        <Label>School Name</Label>
                        <Input value={schoolForm.name} onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })} placeholder="e.g., Sunrise Public School" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input value={schoolForm.address.city} onChange={(e) => setSchoolForm({ ...schoolForm, address: { ...schoolForm.address, city: e.target.value } })} />
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Input value={schoolForm.address.state} onChange={(e) => setSchoolForm({ ...schoolForm, address: { ...schoolForm.address, state: e.target.value } })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Street</Label>
                          <Input value={schoolForm.address.street} onChange={(e) => setSchoolForm({ ...schoolForm, address: { ...schoolForm.address, street: e.target.value } })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Zip Code</Label>
                          <Input value={schoolForm.address.zipCode} onChange={(e) => setSchoolForm({ ...schoolForm, address: { ...schoolForm.address, zipCode: e.target.value } })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>School Email</Label>
                          <Input type="email" value={schoolForm.contactInfo.email} onChange={(e) => setSchoolForm({ ...schoolForm, contactInfo: { ...schoolForm.contactInfo, email: e.target.value } })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input value={schoolForm.contactInfo.phone} onChange={(e) => setSchoolForm({ ...schoolForm, contactInfo: { ...schoolForm.contactInfo, phone: e.target.value } })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input value={schoolForm.contactInfo.website} onChange={(e) => setSchoolForm({ ...schoolForm, contactInfo: { ...schoolForm.contactInfo, website: e.target.value } })} placeholder="https://..." />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" onClick={() => setSchoolOpen(false)} variant="ghost">Cancel</Button>
                      <Button type="button" onClick={() => {
                        if (!schoolForm.name || !schoolForm.address.city || !schoolForm.address.state) {
                          alert("Please fill required fields: name, city, state");
                          return;
                        }
                        setSchoolAdded(true);
                        setSchoolOpen(false);
                        toast({ title: "School Added", description: "You can now create your account." });
                      }}>Save School</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            <Button
              type="submit"
              className={`w-full text-white font-medium py-6 text-base ${isLoading || (isSignup && role === "admin" && !schoolAdded) ? "bg-muted cursor-not-allowed" : "gradient-primary"}`}
              disabled={isLoading || (isSignup && role === "admin" && !schoolAdded)}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  {isSignup ? "Creating Account..." : "Signing In..."}
                </span>
              ) : isSignup && role === "admin" && !schoolAdded ? (
                "Add School First"
              ) : isSignup ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
            <div className="text-center text-sm">
              {isSignup ? (
                <Link to="/login" className="text-primary underline" onClick={() => setIsSignup(false)}>
                  Have an account? Sign in
                </Link>
              ) : (
                <Link to="/signup" className="text-primary underline" onClick={() => setIsSignup(true)}>
                  New here? Create an account
                </Link>
              )}
            </div>
          </form>

          <div className="space-y-3">
            <div className="text-center text-sm text-muted-foreground">
              Quick Demo Access
            </div>
            <div className="grid gap-2">
              {demoAccounts.filter(account => isSignup ? account.role === "admin" : true).map((account) => (
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