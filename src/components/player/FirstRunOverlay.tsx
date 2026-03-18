import React, { useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface FirstRunOverlayProps {
  playerName: string;
  hasWorkout: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

export const FirstRunOverlay: React.FC<FirstRunOverlayProps> = ({
  playerName,
  hasWorkout,
  onStart,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full text-center shadow-xl relative"
      >
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Play className="w-8 h-8 text-primary" />
        </div>

        <h2 id={titleId} className="text-2xl font-bold mb-2">
          {t("welcome.firstRun.title", { name: playerName })}
        </h2>

        <p className="text-muted-foreground mb-6">
          {hasWorkout
            ? t("welcome.firstRun.hasWorkout")
            : t("welcome.firstRun.noWorkout")}
        </p>

        {hasWorkout ? (
          <Button
            size="lg"
            className="w-full rounded-xl"
            onClick={onStart}
            autoFocus
          >
            <Play className="w-5 h-5 mr-2" />
            {t("welcome.firstRun.startButton")}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-xl"
            onClick={onDismiss}
            autoFocus
          >
            {t("welcome.firstRun.gotItButton")}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
};
