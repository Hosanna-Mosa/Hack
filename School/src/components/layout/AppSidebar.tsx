import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  ClipboardList, 
  Settings, 
  Bell,
  BookOpen,
  GraduationCap,
  MessageSquare
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Overview & analytics"
  },
  {
    title: "Students",
    url: "/students",
    icon: Users,
    description: "Manage student profiles"
  },
  {
    title: "Attendance", 
    url: "/attendance",
    icon: UserCheck,
    description: "Track & monitor attendance"
  },
  {
    title: "Classes",
    url: "/classes", 
    icon: BookOpen,
    description: "Manage classes & assignments"
  },
  {
    title: "Teachers",
    url: "/teachers",
    icon: GraduationCap,
    description: "Teacher management"
  },
  {
    title: "Reports",
    url: "/reports",
    icon: ClipboardList,
    description: "Analytics & reporting"
  },
  {
    title: "Communication",
    url: "/communication",
    icon: MessageSquare,
    description: "Messages & announcements"
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    description: "System alerts"
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "System configuration"
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-educational text-sm ${
      isActive 
        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <div className="gradient-primary p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="text-white">
              <h2 className="font-semibold text-lg">EduAdmin</h2>
              <p className="text-xs text-white/80">School Management</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="p-4 space-y-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClass({ isActive: isActive(item.url) })}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && (
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs opacity-70 truncate">
                            {item.description}
                          </div>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}