import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const COLLISION_DISMISSED_KEY = "collisionBannerDismissed";

interface CollisionBannerProps {
  onManageSubscription: () => void;
  portalLoading: boolean;
  cardId?: string;
}

export function CollisionBanner({ onManageSubscription, portalLoading, cardId = "default" }: CollisionBannerProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLISION_DISMISSED_KEY);
    if (stored === cardId) {
      setDismissed(true);
    }
  }, [cardId]);

  const handleDismiss = () => {
    localStorage.setItem(COLLISION_DISMISSED_KEY, cardId);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {t("practice.collision.title")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("practice.collision.description")}
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
          {t("practice.collision.manageButton")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={handleDismiss}
        >
          {t("practice.collision.keepButton")}
        </Button>
      </div>
    </div>
  );
}
