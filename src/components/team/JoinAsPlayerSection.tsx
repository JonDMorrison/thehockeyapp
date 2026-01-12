import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
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
        // Check if it's a duplicate
        if (membershipError.code === "23505") {
          throw new Error("You're already on this team's roster");
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
      toast.success("Joined team!", "You're now on the roster and can participate in training.");
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
        toast.error("Failed to join", error.message);
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
      toast.success("Left roster", "You've been removed from the team roster.");
      setShowLeaveDialog(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to leave", error.message);
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
              <p className="font-medium text-sm">You're on the roster</p>
              <p className="text-xs text-muted-foreground">
                Participating as {existingMembership.playerName}
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
            Leave Roster
          </Button>
        </AppCard>

        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave team roster?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll be removed from {teamName}'s roster and won't receive workouts as a player.
                Your coach access will remain unchanged. You can rejoin anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {leaveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Leave Roster
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
          Participate in Training
        </AppCardTitle>
        <AppCardDescription className="mb-4">
          Want to do the workouts too? Join the roster as a player.
        </AppCardDescription>

        <Button
          variant="team-soft"
          onClick={() => setShowSheet(true)}
          disabled={checkLoading}
          className="w-full"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Join as Player
        </Button>
      </AppCard>

      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>Join {teamName} as a Player</SheetTitle>
            <SheetDescription>
              {existingAdultPlayer
                ? `We'll add your profile "${existingAdultPlayer.first_name}" to this team's roster.`
                : "Create your player profile to participate in training."}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            {existingAdultPlayer ? (
              // Use existing profile
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="font-medium">Using existing profile</p>
                <p className="text-sm text-muted-foreground">
                  {existingAdultPlayer.first_name}{" "}
                  {existingAdultPlayer.last_initial && `${existingAdultPlayer.last_initial}.`}
                  {" • "}Born {existingAdultPlayer.birth_year}
                </p>
              </div>
            ) : (
              // Create new profile form
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">Your First Name</Label>
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
                  <Label htmlFor="birthYear">Birth Year</Label>
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
                  <Label>Shoots</Label>
                  <Select value={shoots} onValueChange={(v: any) => setShoots(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="unknown">Not sure</SelectItem>
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
              {existingAdultPlayer ? "Add Me to Roster" : "Create Profile & Join"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
