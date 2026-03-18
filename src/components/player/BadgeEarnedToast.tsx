import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { BadgeIcon } from "@/components/app/BadgeIcon";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface BadgeEarnedToastProps {
  badgeName: string;
  badgeIcon?: string;
  onClose?: () => void;
}

export const BadgeEarnedToast: React.FC<BadgeEarnedToastProps> = ({
  badgeName,
  badgeIcon = "trophy",
  onClose,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    // Fire celebration confetti
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#9370DB'];

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
    });

    // Second burst after a short delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: colors,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: colors,
      });
    }, 150);
  }, []);

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative pointer-events-auto"
          onClick={onClose}
        >
          {/* Background card with gradient border */}
          <div className="relative bg-card rounded-2xl p-6 max-w-xs text-center shadow-2xl overflow-hidden">
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 -z-10" style={{ padding: '2px' }}>
              <div className="w-full h-full bg-card rounded-2xl" />
            </div>

            {/* Sparkle decorations */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute top-3 right-4"
            >
              <Sparkles className="w-5 h-5 text-amber-400" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute top-6 left-4"
            >
              <Sparkles className="w-4 h-4 text-orange-400" />
            </motion.div>

            {/* Close button — min 44×44px touch target */}
            <button
              onClick={onClose}
              aria-label={t("common.close")}
              className="absolute top-2 right-2 min-h-[44px] min-w-[44px] rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>

            {/* Badge icon with animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="relative mx-auto mb-4"
            >
              <BadgeIcon badgeIcon={badgeIcon} size="xl" showGlow showRing />
            </motion.div>

            {/* Title with gradient text */}
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-bold mb-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent"
            >
              {t("common.badge.earnedTitle")}
            </motion.h3>

            {/* Badge name */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-foreground font-semibold"
            >
              {badgeName}
            </motion.p>

            {/* Dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs text-muted-foreground mt-4"
            >
              {t("common.badge.tapToDismiss")}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
