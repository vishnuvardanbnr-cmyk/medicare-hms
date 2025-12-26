import { useState, useEffect } from "react";
import { Bell, X, AlertCircle, Calendar, Pill, Users, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Notification as DBNotification } from "@shared/schema";

type NotificationType = "appointment" | "lab" | "pharmacy" | "alert" | "info";

interface DisplayNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const getIcon = (type: NotificationType) => {
  switch (type) {
    case "appointment":
      return Calendar;
    case "lab":
      return Clock;
    case "pharmacy":
      return Pill;
    case "alert":
      return AlertCircle;
    case "info":
      return Users;
    default:
      return Bell;
  }
};

const getIconColor = (type: NotificationType) => {
  switch (type) {
    case "appointment":
      return "text-blue-500 bg-blue-100 dark:bg-blue-900/30";
    case "lab":
      return "text-purple-500 bg-purple-100 dark:bg-purple-900/30";
    case "pharmacy":
      return "text-orange-500 bg-orange-100 dark:bg-orange-900/30";
    case "alert":
      return "text-red-500 bg-red-100 dark:bg-red-900/30";
    case "info":
      return "text-green-500 bg-green-100 dark:bg-green-900/30";
    default:
      return "text-gray-500 bg-gray-100 dark:bg-gray-900/30";
  }
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: dbNotifications = [] } = useQuery<DBNotification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const notifications: DisplayNotification[] = dbNotifications.map((n) => ({
    id: n.id,
    type: (n.type as NotificationType) || "info",
    title: n.title,
    message: n.message,
    timestamp: new Date(n.createdAt || Date.now()),
    read: n.isRead || false,
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAsRead = (id: number) => {
    markReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    markAllReadMutation.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread notifications
            </p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              data-testid="button-mark-all-read"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 transition-colors hover:bg-muted/50 cursor-pointer",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          getIconColor(notification.type)
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">
                              {notification.title}
                              {!notification.read && (
                                <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">
                                  New
                                </Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="p-3 border-t">
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            onClick={() => setOpen(false)}
            data-testid="button-view-all-notifications"
          >
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
