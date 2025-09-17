import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Bell, Settings, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface MainLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
}

export function MainLayout({ children, user, onLogout }: MainLayoutProps) {
  const [notifications] = useState(0);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="lg:hidden" />
                <div className="hidden lg:block">
                  <h1 className="text-xl font-semibold">School Administration Panel</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-5 h-5" />
                  {notifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1 py-0 text-xs bg-destructive text-destructive-foreground min-w-[20px] h-5">
                      {notifications}
                    </Badge>
                  )}
                </Button>

                {/* Settings */}
                <Button variant="ghost" size="sm">
                  <Settings className="w-5 h-5" />
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <div className="hidden md:block text-left">
                        <div className="text-sm font-medium">{user?.name || "User"}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {user?.role || "Administrator"}
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2">
                      <User className="w-4 h-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Settings className="w-4 h-4" />
                      System Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-border bg-card/30 px-6 py-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                © 2024 EduAdmin - School Management System
              </div>
              <div className="flex items-center gap-4">
                <span>Version 1.0.0</span>
                <span>•</span>
                <span>Support: admin@school.edu</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}