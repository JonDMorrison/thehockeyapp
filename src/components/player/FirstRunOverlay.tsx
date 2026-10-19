import React, { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface FirstRunOverlayProps {
  playerName: string;
  hasWorkout: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

export const FirstRunOverlay: React.FC<FirstRunOverlayProps> = ({ playerName, hasWorkout, onStart, onDismiss }) => {
  const { t } = useTranslation();
  const primaryAction = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onDismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm" />
        <Dialog.Content
          onOpenAutoFocus={event => { event.preventDefault(); primaryAction.current?.focus(); }}
          className="fixed left-1/2 top-1/2 z-[70] max-h-[calc(100dvh_-_3rem)] w-[calc(100vw_-_3rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-border bg-card p-8 text-center shadow-xl"
        >
          <Dialog.Close asChild>
            <button aria-label="Close welcome" className="absolute right-4 top-4 rounded-full p-3 transition-colors hover:bg-muted">
              <X aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            </button>
          </Dialog.Close>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Play aria-hidden="true" className="h-8 w-8 text-primary" />
          </div>
          <Dialog.Title className="mb-2 text-2xl font-bold">{t("welcome.firstRun.title", { name: playerName })}</Dialog.Title>
          <Dialog.Description className="mb-6 text-muted-foreground">
            {hasWorkout ? t("welcome.firstRun.hasWorkout") : t("welcome.firstRun.noWorkout")}
          </Dialog.Description>
          <Button ref={primaryAction} size="lg" variant={hasWorkout ? "default" : "outline"} className="w-full rounded-xl" onClick={hasWorkout ? onStart : onDismiss}>
            {hasWorkout && <Play aria-hidden="true" className="mr-2 h-5 w-5" />}
            {hasWorkout ? t("welcome.firstRun.startButton") : t("welcome.firstRun.gotItButton")}
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
