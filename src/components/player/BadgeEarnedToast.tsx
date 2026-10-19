import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import { BadgeIcon } from "@/components/app/BadgeIcon";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BRAND_CONFETTI_COLORS } from "@/lib/brand";

interface BadgeEarnedToastProps {
  badgeName: string;
  badgeIcon?: string;
  onClose?: () => void;
}

export function BadgeEarnedToast({ badgeName, badgeIcon = "trophy", onClose }: BadgeEarnedToastProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: BRAND_CONFETTI_COLORS, disableForReducedMotion: true });
    const timer = window.setTimeout(() => {
      for (const x of [0, 1]) confetti({ particleCount: 50, angle: x ? 120 : 60, spread: 55, origin: { x, y: 0.6 }, colors: BRAND_CONFETTI_COLORS, disableForReducedMotion: true });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose?.(); }}>
      <DialogContent className="max-w-xs overflow-hidden border-primary/30 text-center">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-rose-400 to-primary" />
        <BadgeIcon badgeIcon={badgeIcon} size="xl" showGlow showRing className="mx-auto mt-4" />
        <DialogTitle className="text-center text-xl">{t("common.badge.earnedTitle")}</DialogTitle>
        <DialogDescription className="text-center text-base font-semibold text-foreground">{badgeName}</DialogDescription>
        <Button className="mt-2 min-h-11 w-full" onClick={onClose}>{t("common.close")}</Button>
      </DialogContent>
    </Dialog>
  );
}
