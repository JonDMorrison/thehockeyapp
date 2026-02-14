import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface CollisionBannerProps {
  onManageSubscription: () => void;
  portalLoading: boolean;
}

export function CollisionBanner({ onManageSubscription, portalLoading }: CollisionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            You're currently covered by your team's plan.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            You may be paying for an individual subscription you no longer need. You can cancel it to avoid double paying.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={onManageSubscription}
          disabled={portalLoading}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Manage Parent Subscription
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => setDismissed(true)}
        >
          Keep as-is
        </Button>
      </div>
    </div>
  );
}
