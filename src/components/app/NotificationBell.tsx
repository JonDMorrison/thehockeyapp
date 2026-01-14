import { Bell, Check, Target, Trophy, X, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'goal_created':
      return <Target className="w-4 h-4 text-blue-500" />;
    case 'goal_achieved':
      return <Trophy className="w-4 h-4 text-amber-500" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

function NotificationItem({ 
  notification, 
  onMarkRead, 
  onDelete,
  onClick 
}: { 
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <div 
      className={cn(
        "p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer",
        !notification.is_read && "bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <NotificationIcon type={notification.notification_type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm font-medium truncate",
              !notification.is_read && "text-foreground",
              notification.is_read && "text-muted-foreground"
            )}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!notification.is_read && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
            >
              <Check className="w-3 h-3" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    const metadata = notification.metadata as { goal_id?: string; team_id?: string };
    if (notification.notification_type === 'goal_created' || notification.notification_type === 'goal_achieved') {
      if (metadata.goal_id) {
        // Navigate to goals page - we need to find the player for this team
        // For now, just mark as read
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs gap-1"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                You'll see alerts here when your team sets new goals
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markAsRead(notification.id)}
                onDelete={() => deleteNotification(notification.id)}
                onClick={() => handleNotificationClick(notification)}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
