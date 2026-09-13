import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, Circle, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";

interface GettingStartedChecklistProps {
  teamId: string;
  onInvite: () => void;
}

const dismissedKey = (teamId: string) =>
  `hockeyapp-getting-started-dismissed-${teamId}`;
const invitedKey = (teamId: string) =>
  `hockeyapp-getting-started-invited-${teamId}`;

const readFlag = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

const writeFlag = (key: string) => {
  try {
    localStorage.setItem(key, "true");
  } catch {
    // ignore storage failures
  }
};

export const GettingStartedChecklist: React.FC<GettingStartedChecklistProps> = ({
  teamId,
  onInvite,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    setDismissed(readFlag(dismissedKey(teamId)));
  }, [teamId]);

  // Step 2: roster has at least one active player
  const { data: hasPlayers, isLoading: loadingPlayers } = useQuery({
    queryKey: ["getting-started-players", teamId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("team_memberships")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "active");
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!teamId,
  });

  // Step 3: at least one published practice card
  const { data: hasPublished, isLoading: loadingPublished } = useQuery({
    queryKey: ["getting-started-published", teamId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("practice_cards")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .not("published_at", "is", null);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!teamId,
  });

  // Step 4: at least one roster player has a real (non-coach) linked guardian/player account
  const { data: hasInvited, isLoading: loadingInvited } = useQuery({
    queryKey: ["getting-started-invited", teamId, user?.id],
    queryFn: async () => {
      const { data: memberships, error: mErr } = await supabase
        .from("team_memberships")
        .select("player_id")
        .eq("team_id", teamId)
        .eq("status", "active");
      if (mErr) throw mErr;

      const playerIds = (memberships ?? [])
        .map((m) => m.player_id)
        .filter((pid): pid is string => !!pid);

      if (playerIds.length === 0) {
        return readFlag(invitedKey(teamId));
      }

      let guardianQuery = supabase
        .from("player_guardians")
        .select("player_id", { count: "exact", head: true })
        .in("player_id", playerIds);

      if (user?.id) {
        guardianQuery = guardianQuery.neq("user_id", user.id);
      }

      const { count, error: gErr } = await guardianQuery;
      if (gErr) throw gErr;

      // Data signal first; fall back to the localStorage flag if no real account joined yet.
      return (count ?? 0) > 0 || readFlag(invitedKey(teamId));
    },
    enabled: !!teamId,
  });

  const isLoading = loadingPlayers || loadingPublished || loadingInvited;

  const handleInvite = () => {
    writeFlag(invitedKey(teamId));
    onInvite();
  };

  const handleDismiss = () => {
    writeFlag(dismissedKey(teamId));
    setDismissed(true);
  };

  const steps = [
    {
      key: "createTeam",
      label: t("gettingStarted.steps.createTeam"),
      done: true,
      action: null as React.ReactNode,
    },
    {
      key: "addPlayers",
      label: t("gettingStarted.steps.addPlayers"),
      done: !!hasPlayers,
      action: (
        <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1">
          <Link to={`/teams/${teamId}/roster`}>
            {t("gettingStarted.actions.addPlayers")}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      ),
    },
    {
      key: "publishWeek",
      label: t("gettingStarted.steps.publishWeek"),
      done: !!hasPublished,
      action: (
        <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1">
          <Link to={`/teams/${teamId}/builder/new`}>
            {t("gettingStarted.actions.publishWeek")}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      ),
    },
    {
      key: "invite",
      label: t("gettingStarted.steps.invite"),
      done: !!hasInvited,
      action: (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1"
          onClick={handleInvite}
        >
          {t("gettingStarted.actions.invite")}
          <ChevronRight className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allComplete = doneCount === steps.length;

  // Auto-hide permanently once everything is complete.
  React.useEffect(() => {
    if (!isLoading && allComplete && !readFlag(dismissedKey(teamId))) {
      writeFlag(dismissedKey(teamId));
    }
  }, [isLoading, allComplete, teamId]);

  // Avoid flashing while data loads.
  if (isLoading) return null;
  if (dismissed || allComplete) return null;

  return (
    <AppCard className="relative">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">
            {t("gettingStarted.title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("gettingStarted.progress", {
              done: doneCount,
              total: steps.length,
            })}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {steps.map((step) => (
          <li
            key={step.key}
            className="flex items-center gap-3 rounded-md py-1.5"
          >
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${
                step.done ? "bg-success text-white" : "text-muted-foreground"
              }`}
            >
              {step.done ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
            </span>
            <span
              className={`flex-1 min-w-0 text-sm ${
                step.done ? "text-muted-foreground line-through" : "font-medium"
              }`}
            >
              {step.label}
            </span>
            {!step.done && step.action}
          </li>
        ))}
      </ul>

      <div className="mt-3 text-right">
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {t("gettingStarted.dismiss")}
        </button>
      </div>
    </AppCard>
  );
};

export default GettingStartedChecklist;
