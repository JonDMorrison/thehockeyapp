import React from "react";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Cloud, CloudOff, Loader2 } from "lucide-react";
import { OfflineStatus } from "@/hooks/useOffline";

interface OfflineIndicatorProps {
  status: OfflineStatus;
  pendingCount?: number;
  className?: string;
}

const statusConfig: Record<OfflineStatus, {
  icon: React.ElementType;
  label: string;
  variant: 'default' | 'warning' | 'muted';
}> = {
  online: {
    icon: Cloud,
    label: 'Online',
    variant: 'default',
  },
  offline: {
    icon: WifiOff,
    label: 'Offline',
    variant: 'warning',
  },
  syncing: {
    icon: Loader2,
    label: 'Syncing...',
    variant: 'default',
  },
  pending: {
    icon: CloudOff,
    label: 'Saved on device',
    variant: 'warning',
  },
  error: {
    icon: CloudOff,
    label: 'Sync pending',
    variant: 'warning',
  },
};

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  status,
  pendingCount = 0,
  className,
}) => {
  // Don't show anything when online and synced
  if (status === 'online' && pendingCount === 0) {
    return null;
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all",
        config.variant === 'warning' && "bg-warning-muted text-warning-foreground",
        config.variant === 'default' && "bg-muted text-muted-foreground",
        config.variant === 'muted' && "bg-muted/50 text-text-muted",
        className
      )}
    >
      <Icon
        className={cn(
          "w-3 h-3",
          status === 'syncing' && "animate-spin"
        )}
      />
      <span>{config.label}</span>
      {pendingCount > 0 && status !== 'online' && (
        <span className="opacity-70">({pendingCount})</span>
      )}
    </div>
  );
};

// Compact version for headers
export const OfflineDot: React.FC<{ status: OfflineStatus; className?: string }> = ({
  status,
  className,
}) => {
  if (status === 'online') return null;

  return (
    <div
      className={cn(
        "w-2 h-2 rounded-full",
        status === 'offline' && "bg-warning animate-pulse",
        status === 'syncing' && "bg-primary animate-pulse",
        status === 'pending' && "bg-warning",
        status === 'error' && "bg-destructive",
        className
      )}
      title={statusConfig[status].label}
    />
  );
};
