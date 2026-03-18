import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScheduleSyncSection } from "@/components/team/ScheduleSyncSection";

interface ScheduleConnectStepProps {
  teamId: string;
  isConnected: boolean;
  onConnected: () => void;
}

export function ScheduleConnectStep({
  teamId,
  isConnected,
  onConnected,
}: ScheduleConnectStepProps) {
  const { t } = useTranslation();
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{t("welcome.scheduleConnect.title")}</h1>
        <p className="text-muted-foreground">
          {t("welcome.scheduleConnect.subtitle")}
        </p>
      </div>

      {isConnected ? (
        <div className="p-6 rounded-xl border-2 border-primary bg-primary/5 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">{t("welcome.scheduleConnect.connectedTitle")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("welcome.scheduleConnect.connectedSubtitle")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setShowScheduleSheet(true)}
            className="w-full p-4 rounded-xl border-2 border-border bg-card hover:border-primary/50 transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{t("welcome.scheduleConnect.connectButtonTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("welcome.scheduleConnect.connectButtonSubtitle")}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {t("welcome.scheduleConnect.setupLaterHint")}
          </p>
        </div>
      )}

      <Sheet open={showScheduleSheet} onOpenChange={setShowScheduleSheet}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>{t("welcome.scheduleConnect.sheetTitle")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex-1">
            <ScheduleSyncSection
              teamId={teamId}
              onConnected={() => {
                onConnected();
                setShowScheduleSheet(false);
              }}
            />
          </div>
          <div className="pt-4 pb-2">
            <Button
              className="w-full"
              onClick={() => setShowScheduleSheet(false)}
            >
              {t("welcome.scheduleConnect.doneButton")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
