import React from "react";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Cloud, CloudOff, Loader2 } from "lucide-react";
import { OfflineStatus } from "@/hooks/useOffline";
import { useTranslation } from "react-i18next";

interface OfflineIndicatorProps {
  status: OfflineStatus;
  pendingCount?: number;
  className?: string;
}

type StatusVariant = 'default' | 'warning' | 'muted';

const statusConfig: Record<OfflineStatus, {
  icon: React.ElementType;
  labelKey: string;
  variant: StatusVariant;
}> = {
  online: {
    icon: Cloud,
    labelKey: 'common.online',
    variant: 'default',
  },
  offline: {
    icon: WifiOff,
    labelKey: 'common.offline',
    variant: 'warning',
  },
  syncing: {
    icon: Loader2,
    labelKey: 'common.syncing',
    variant: 'default',
  },
  pending: {
    icon: CloudOff,
    labelKey: 'common.syncPending',
    variant: 'warning',
  },
  error: {
    icon: CloudOff,
    labelKey: 'common.syncFailed',
    variant: 'warning',
  },
};

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  status,
  pendingCount = 0,
  className,
}) => {
  const { t } = useTranslation();

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
      <span>{t(config.labelKey)}</span>
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
  const { t } = useTranslation();

  if (status === 'online') return null;

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <div
        className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          status === 'offline' && "bg-warning animate-pulse",
          status === 'syncing' && "bg-primary animate-pulse",
          status === 'pending' && "bg-warning",
          status === 'error' && "bg-destructive",
        )}
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-muted-foreground">
        {t(statusConfig[status].labelKey)}
      </span>
    </div>
  );
};
