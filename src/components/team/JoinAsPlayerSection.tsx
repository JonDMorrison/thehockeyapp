import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/app/Toast";
import { Dumbbell, Loader2, Check, UserPlus, LogOut } from "lucide-react";

const playerSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(50),
  birth_year: z.number().int().min(1950).max(2010),
  shoots: z.enum(["left", "right", "unknown"]),
});

interface JoinAsPlayerSectionProps {
  teamId: string;
  teamName: string;
}

export const JoinAsPlayerSection: React.FC<JoinAsPlayerSectionProps> = ({
  teamId,
  teamName,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSheet, setShowSheet] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [birthYear, setBirthYear] = useState(1990);
  const [shoots, setShoots] = useState<"left" | "right" | "unknown">("unknown");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if user already has an adult player profile on this team
  const { data: existingMembership, isLoading: checkLoading } = useQuery({
    queryKey: ["adult-player-membership", teamId, user?.id],
    queryFn: async () => {
      // First find adult player profiles owned by this user
      const { data: players } = await supabase
        .from("players")
        .select("id, first_name")
        .eq("owner_user_id", user!.id)
        .lt("birth_year", 2008); // Adults only

      if (!players || players.length === 0) return null;

      // Check if any of these players are on this team
      const playerIds = players.map((p) => p.id);
      const { data: memberships } = await supabase
        .from("team_memberships")
        .select("id, player_id")
        .eq("team_id", teamId)
        .in("player_id", playerIds)
        .eq("status", "active");

      if (memberships && memberships.length > 0) {
        const membership = memberships[0];
        const memberPlayer = players.find((p) => p.id === membership.player_id);
        return {
          membershipId: membership.id,
          playerId: membership.player_id,
          playerName: memberPlayer?.first_name || "You",
        };
      }

      return null;
    },
    enabled: !!user,
  });

  // Check if user has any existing adult player profile (to reuse)
  const { data: existingAdultPlayer } = useQuery({
    queryKey: ["existing-adult-player", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("players")
        .select("id, first_name, last_initial, birth_year, shoots")
        .eq("owner_user_id", user!.id)
        .lt("birth_year", 2008)
        .limit(1)
        .maybeSingle();

      return data;
    },
    enabled: !!user && !existingMembership,
  });

  // Create player and join team
  const joinMutation = useMutation({
    mutationFn: async () => {
      let playerId: string;

      if (existingAdultPlayer) {
        // Reuse existing adult player profile
        playerId = existingAdultPlayer.id;
      } else {
        // Validate form
        const validated = playerSchema.parse({
          first_name: firstName,
          birth_year: birthYear,
          shoots,
        });

        // Create new adult player profile
        const { data: newPlayer, error: playerError } = await supabase
          .from("players")
          .insert({
            owner_user_id: user!.id,
            first_name: validated.first_name,
            birth_year: validated.birth_year,
            shoots: validated.shoots,
          })
          .select()
          .single();

        if (playerError) throw playerError;
        playerId = newPlayer.id;

        // Add as guardian with owner role
        await supabase.from("player_guardians").insert({
          player_id: playerId,
          user_id: user!.id,
          guardian_role: "owner",
        });
      }

      // Add to team roster
      const { error: membershipError } = await supabase
        .from("team_memberships")
        .insert({
          team_id: teamId,
          player_id: playerId,
          status: "active",
        });

      if (membershipError) {
        if (membershipError.code === "23505") {
          throw new Error("You're already on this team's roster");
        }
        if (membershipError.message?.includes("team_plan_player_cap_reached")) {
          throw new Error("This team's plan covers up to 24 players. Ask the head coach to remove a player or upgrade.");
        }
        throw membershipError;
      }

      return { playerId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adult-player-membership", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-roster", teamId] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-coach-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-guardian-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-own-player"] });
      toast.success(t("teams.joinAsPlayer.toastJoinedTitle"), t("teams.joinAsPlayer.toastJoinedDescription"));
      setShowSheet(false);
    },
    onError: (error: Error) => {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      } else {
        toast.error(t("teams.joinAsPlayer.toastJoinFailedTitle"), error.message);
      }
    },
  });

  // Leave team mutation
  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!existingMembership) {
        throw new Error("No membership found");
      }

      // Update status to 'left' instead of deleting (preserves history)
      const { error } = await supabase
        .from("team_memberships")
        .update({ status: "left" })
        .eq("id", existingMembership.membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adult-player-membership", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-roster", teamId] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-coach-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-guardian-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-own-player"] });
      toast.success(t("teams.joinAsPlayer.toastLeftTitle"), t("teams.joinAsPlayer.toastLeftDescription"));
      setShowLeaveDialog(false);
    },
    onError: (error: Error) => {
      toast.error(t("teams.joinAsPlayer.toastLeaveFailedTitle"), error.message);
    },
  });

  // Already on team - show leave option
  if (existingMembership) {
    return (
      <>
        <AppCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{t("teams.joinAsPlayer.onRoster")}</p>
              <p className="text-xs text-muted-foreground">
                {t("teams.joinAsPlayer.participatingAs", { playerName: existingMembership.playerName })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLeaveDialog(true)}
            className="w-full text-muted-foreground hover:text-destructive hover:border-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("teams.joinAsPlayer.leaveRoster")}
          </Button>
        </AppCard>

        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("teams.joinAsPlayer.leaveDialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("teams.joinAsPlayer.leaveDialogDescription", { teamName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {leaveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {t("teams.joinAsPlayer.leaveRoster")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <AppCard>
        <AppCardTitle className="text-lg flex items-center gap-2 mb-1">
          <Dumbbell className="w-4 h-4 text-team-primary" />
          {t("teams.joinAsPlayer.title")}
        </AppCardTitle>
        <AppCardDescription className="mb-4">
          {t("teams.joinAsPlayer.description")}
        </AppCardDescription>

        <Button
          variant="team-soft"
          onClick={() => setShowSheet(true)}
          disabled={checkLoading}
          className="w-full"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {t("teams.joinAsPlayer.joinButton")}
        </Button>
      </AppCard>

      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>{t("teams.joinAsPlayer.sheetTitle", { teamName })}</SheetTitle>
            <SheetDescription>
              {existingAdultPlayer
                ? t("teams.joinAsPlayer.sheetDescriptionExisting", { name: existingAdultPlayer.first_name })
                : t("teams.joinAsPlayer.sheetDescriptionNew")}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            {existingAdultPlayer ? (
              // Use existing profile
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="font-medium">{t("teams.joinAsPlayer.usingExisting")}</p>
                <p className="text-sm text-muted-foreground">
                  {existingAdultPlayer.first_name}{" "}
                  {existingAdultPlayer.last_initial && `${existingAdultPlayer.last_initial}.`}
                  {" • "}{t("teams.addChild.bornYear", { year: existingAdultPlayer.birth_year })}
                </p>
              </div>
            ) : (
              // Create new profile form
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("teams.joinAsPlayer.firstNameLabel")}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Coach Mike"
                    className={errors.first_name ? "border-destructive" : ""}
                  />
                  {errors.first_name && (
                    <p className="text-xs text-destructive">{errors.first_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthYear">{t("teams.addChild.birthYear")}</Label>
                  <Select
                    value={String(birthYear)}
                    onValueChange={(v) => setBirthYear(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 50 }, (_, i) => 2000 - i).map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("teams.addChild.shoots")}</Label>
                  <Select value={shoots} onValueChange={(v) => setShoots(v as "left" | "right" | "unknown")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">{t("teams.addChild.shootsLeft")}</SelectItem>
                      <SelectItem value="right">{t("teams.addChild.shootsRight")}</SelectItem>
                      <SelectItem value="unknown">{t("teams.joinAsPlayer.shootsNotSure")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button
              variant="team"
              className="w-full"
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
            >
              {joinMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {existingAdultPlayer ? t("teams.joinAsPlayer.addMeToRoster") : t("teams.joinAsPlayer.createAndJoin")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
