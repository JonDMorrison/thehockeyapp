import { useState } from "react";
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
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Want game days handled automatically?</h1>
        <p className="text-muted-foreground">
          If you use TeamSnap, we can detect games and automatically switch to Game Day Prep.
        </p>
      </div>

      {isConnected ? (
        <div className="p-6 rounded-xl border-2 border-primary bg-primary/5 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Schedule connected!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Game days will be detected automatically
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
                <h3 className="font-semibold">Connect TeamSnap schedule</h3>
                <p className="text-sm text-muted-foreground">
                  Sync games and practices automatically
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>

          <p className="text-center text-sm text-muted-foreground">
            You can also set this up later in Team Settings
          </p>
        </div>
      )}

      <Sheet open={showScheduleSheet} onOpenChange={setShowScheduleSheet}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Connect Schedule</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ScheduleSyncSection
              teamId={teamId}
              onConnected={() => {
                onConnected();
                setShowScheduleSheet(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
