import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Clock, 
  MessageCircle,
  Calendar,
  FileText,
  Trash2,
  Mail
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

interface Notification {
  id: string;
  type: "absence" | "late" | "info" | "event" | "message";
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  priority: "low" | "medium" | "high";
  actionRequired?: boolean;
}

export function NotificationPanel() {
  const [filter, setFilter] = useState<"all" | "unread" | "high">("all");
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "absence",
      title: "Absence Alert",
      message: "Emma was marked absent on January 12, 2024. If this is incorrect, please contact the school office.",
      date: "2024-01-12T09:00:00Z",
      isRead: false,
      priority: "high",
      actionRequired: true
    },
    {
      id: "2", 
      type: "late",
      title: "Late Arrival Notice",
      message: "Emma arrived late today (8:45 AM). Traffic delays were noted as the reason.",
      date: "2024-01-14T08:45:00Z",
      isRead: false,
      priority: "medium"
    },
    {
      id: "3",
      type: "event",
      title: "Upcoming Parent-Teacher Conference",
      message: "Your scheduled conference with Ms. Smith is on January 20, 2024 at 2:00 PM. Please confirm your attendance.",
      date: "2024-01-10T10:00:00Z",
      isRead: true,
      priority: "medium",
      actionRequired: true
    },
    {
      id: "4",
      type: "info",
      title: "School Closure Notice",
      message: "The school will be closed on January 18, 2024 due to a scheduled maintenance day.",
      date: "2024-01-08T16:00:00Z",
      isRead: true,
      priority: "low"
    },
    {
      id: "5",
      type: "message",
      title: "Message from Teacher",
      message: "Emma did excellent work on her science project! Please encourage her to continue this enthusiasm.",
      date: "2024-01-05T14:30:00Z",
      isRead: true,
      priority: "low"
    },
    {
      id: "6",
      type: "info", 
      title: "Attendance Milestone",
      message: "Congratulations! Emma has maintained 95% attendance this month. Keep up the great work!",
      date: "2024-01-01T12:00:00Z",
      isRead: true,
      priority: "low"
    }
  ]);

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === "high" ? "text-danger" : priority === "medium" ? "text-warning" : "text-muted-foreground";
    
    switch (type) {
      case "absence": return <AlertTriangle className={`w-5 h-5 ${iconClass}`} />;
      case "late": return <Clock className={`w-5 h-5 ${iconClass}`} />;
      case "event": return <Calendar className={`w-5 h-5 ${iconClass}`} />;
      case "message": return <MessageCircle className={`w-5 h-5 ${iconClass}`} />;
      case "info": return <Info className={`w-5 h-5 ${iconClass}`} />;
      default: return <Bell className={`w-5 h-5 ${iconClass}`} />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: "destructive",
      medium: "secondary", 
      low: "outline"
    } as const;
    
    return (
      <Badge variant={variants[priority as keyof typeof variants]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAsUnread = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: false }
          : notification
      )
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case "unread": return !notification.isRead;
      case "high": return notification.priority === "high";
      default: return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const highPriorityCount = notifications.filter(n => n.priority === "high").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
          <p className="text-muted-foreground">Stay updated with your child's school activities</p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            onClick={() => setFilter("unread")}
            size="sm"
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === "high" ? "default" : "outline"}
            onClick={() => setFilter("high")}
            size="sm"
          >
            High Priority ({highPriorityCount})
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-design-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-danger/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-2xl font-bold text-danger">{highPriorityCount}</p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-design-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{unreadCount}</p>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-design-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{notifications.length - unreadCount}</p>
                <p className="text-sm text-muted-foreground">Read</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card className="shadow-design-md border-0">
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>
            {filter === "all" && `Showing all ${filteredNotifications.length} notifications`}
            {filter === "unread" && `Showing ${filteredNotifications.length} unread notifications`}
            {filter === "high" && `Showing ${filteredNotifications.length} high priority notifications`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 border rounded-lg transition-all hover:shadow-design-sm ${
                    !notification.isRead ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.type, notification.priority)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`font-medium ${!notification.isRead ? "text-primary" : ""}`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                          {notification.actionRequired && (
                            <Badge variant="outline" className="text-xs">Action Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(parseISO(notification.date), { addSuffix: true })}</span>
                          <span>{format(parseISO(notification.date), "MMM d, yyyy 'at' h:mm a")}</span>
                          {getPriorityBadge(notification.priority)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-4">
                      {notification.isRead ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markAsUnread(notification.id)}
                          className="h-8 w-8"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markAsRead(notification.id)}
                          className="h-8 w-8"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNotification(notification.id)}
                        className="h-8 w-8 text-danger hover:text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No notifications</h3>
              <p className="text-sm text-muted-foreground">
                {filter === "unread" && "All notifications have been read"}
                {filter === "high" && "No high priority notifications"}
                {filter === "all" && "You're all caught up!"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}