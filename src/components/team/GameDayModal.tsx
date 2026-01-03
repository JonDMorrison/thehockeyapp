import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/app/Toast";
import { format, parseISO } from "date-fns";
import { Calendar, Zap, AlertTriangle } from "lucide-react";

interface GameDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
}

// Default game day tasks template
const DEFAULT_GAME_DAY_TASKS = [
  {
    sort_order: 0,
    task_type: "prep",
    label: "Visualization (5 minutes)",
    target_type: "minutes",
    target_value: 5,
    shot_type: "none",
    shots_expected: null,
    is_required: true,
  },
  {
    sort_order: 1,
    task_type: "mobility",
    label: "Dynamic warm-up / stretching (8 minutes)",
    target_type: "minutes",
    target_value: 8,
    shot_type: "none",
    shots_expected: null,
    is_required: true,
  },
  {
    sort_order: 2,
    task_type: "prep",
    label: "Hydration check",
    target_type: "none",
    target_value: null,
    shot_type: "none",
    shots_expected: null,
    is_required: true,
  },
  {
    sort_order: 3,
    task_type: "prep",
    label: "Good meal planned",
    target_type: "none",
    target_value: null,
    shot_type: "none",
    shots_expected: null,
    is_required: true,
  },
  {
    sort_order: 4,
    task_type: "prep",
    label: "Pack gear + stick + water bottle",
    target_type: "none",
    target_value: null,
    shot_type: "none",
    shots_expected: null,
    is_required: true,
  },
  {
    sort_order: 5,
    task_type: "other",
    label: "Light activation (optional)",
    target_type: "minutes",
    target_value: 5,
    shot_type: "none",
    shots_expected: null,
    is_required: false,
  },
];

export const GameDayModal: React.FC<GameDayModalProps> = ({
  open,
  onOpenChange,
  teamId,
  teamName,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [notes, setNotes] = useState("");

  // Check if game day is already enabled for selected date
  const { data: gameDay, isLoading } = useQuery({
    queryKey: ["team-game-day", teamId, selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_game_days")
        .select("*")
        .eq("team_id", teamId)
        .eq("date", selectedDate)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!teamId,
  });

  // Update notes when gameDay data loads
  useEffect(() => {
    if (gameDay?.notes) {
      setNotes(gameDay.notes);
    } else {
      setNotes("");
    }
  }, [gameDay]);

  const isEnabled = gameDay?.enabled === true;

  // Enable game day mutation
  const enableMutation = useMutation({
    mutationFn: async () => {
      // 1. Upsert team_game_days
      const { error: gameDayError } = await supabase
        .from("team_game_days")
        .upsert(
          {
            team_id: teamId,
            date: selectedDate,
            enabled: true,
            notes: notes || null,
            created_by_user_id: user!.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "team_id,date" }
        );

      if (gameDayError) throw gameDayError;

      // 2. Check if game_day practice card exists
      const { data: existingCard } = await supabase
        .from("practice_cards")
        .select("id")
        .eq("team_id", teamId)
        .eq("date", selectedDate)
        .eq("mode", "game_day")
        .maybeSingle();

      let practiceCardId = existingCard?.id;

      if (!practiceCardId) {
        // 3. Create game day practice card from template
        const { data: newCard, error: cardError } = await supabase
          .from("practice_cards")
          .insert({
            team_id: teamId,
            date: selectedDate,
            mode: "game_day",
            tier: "rep",
            title: "Game Day Prep",
            notes: "Keep it light. Focus on readiness.",
            created_by_user_id: user!.id,
            published_at: new Date().toISOString(), // Auto-publish
          })
          .select()
          .single();

        if (cardError) throw cardError;
        practiceCardId = newCard.id;

        // 4. Insert default tasks
        const tasksToInsert = DEFAULT_GAME_DAY_TASKS.map((task) => ({
          ...task,
          practice_card_id: practiceCardId,
        }));

        const { error: tasksError } = await supabase
          .from("practice_tasks")
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      } else {
        // Ensure card is published
        await supabase
          .from("practice_cards")
          .update({ published_at: new Date().toISOString() })
          .eq("id", practiceCardId)
          .is("published_at", null);
      }

      return { practiceCardId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-game-day", teamId] });
      queryClient.invalidateQueries({ queryKey: ["practice-cards", teamId] });
      toast.success(
        "Game Day enabled",
        `${teamName} is in Game Day mode for ${format(
          parseISO(selectedDate),
          "MMM d"
        )}`
      );
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to enable Game Day", error.message);
    },
  });

  // Disable game day mutation
  const disableMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_game_days")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("team_id", teamId)
        .eq("date", selectedDate);

      if (error) throw error;

      // Unpublish the game_day card (optional, but keeps it out of Today)
      await supabase
        .from("practice_cards")
        .update({ published_at: null })
        .eq("team_id", teamId)
        .eq("date", selectedDate)
        .eq("mode", "game_day");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-game-day", teamId] });
      queryClient.invalidateQueries({ queryKey: ["practice-cards", teamId] });
      toast.success("Game Day disabled", "Normal training resumes.");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to disable Game Day", error.message);
    },
  });

  const handleToggle = () => {
    if (isEnabled) {
      disableMutation.mutate();
    } else {
      enableMutation.mutate();
    }
  };

  const isPending = enableMutation.isPending || disableMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-team-primary" />
            Game Day Mode
          </SheetTitle>
          <SheetDescription>
            Replace normal training with a game day prep checklist
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Date Selector */}
          <div>
            <Label htmlFor="date">Date</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-text-muted" />
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Current Status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-muted">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isEnabled ? "bg-success" : "bg-muted-foreground"
                }`}
              />
              <div>
                <p className="font-medium">
                  {isEnabled ? "Game Day Active" : "Normal Training"}
                </p>
                <p className="text-sm text-text-muted">
                  {format(parseISO(selectedDate), "EEEE, MMMM d")}
                </p>
              </div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isLoading || isPending}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., 7pm game vs Tigers"
              className="mt-1.5"
              rows={2}
            />
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-warning-muted border border-warning/20">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-warning">Game Day Prep Only</p>
                <p className="text-text-muted mt-1">
                  Parents will see a light prep checklist instead of the normal
                  workout. Focus on readiness, not conditioning.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleToggle}
              disabled={isLoading || isPending}
            >
              {isPending
                ? "Saving..."
                : isEnabled
                ? "Disable Game Day"
                : "Enable Game Day"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
