import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface SoloJoinTeamSectionProps {
  playerId: string;
  variant?: "card" | "section";
}

export const SoloJoinTeamSection: React.FC<SoloJoinTeamSectionProps> = ({
  playerId,
  variant = "section",
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [showInput, setShowInput] = useState(false);

  // Check if player is already on any teams
  const { data: existingTeams } = useQuery({
    queryKey: ["player-team-memberships", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("id, team_id, teams(id, name)")
        .eq("player_id", playerId)
        .eq("status", "active");

      if (error) throw error;
      return data || [];
    },
    enabled: !!playerId,
  });

  const handleValidateCode = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Enter invite code",
        description: "Please enter the invite code from your coach.",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    try {
      // Check if the invite code is valid
      const { data: invite, error } = await supabase
        .from("team_invites")
        .select("id, team_id, status, expires_at, teams(name)")
        .eq("token", inviteCode.trim())
        .single();

      if (error || !invite) {
        toast({
          title: "Invalid code",
          description: "That invite code wasn't found. Check with your coach.",
          variant: "destructive",
        });
        return;
      }

      if (invite.status !== "active") {
        toast({
          title: "Invite expired",
          description: "This invite is no longer active.",
          variant: "destructive",
        });
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        toast({
          title: "Invite expired",
          description: "This invite has expired. Ask your coach for a new one.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to the join flow with player pre-selected
      navigate(`/join/${inviteCode.trim()}?playerId=${playerId}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const hasTeams = existingTeams && existingTeams.length > 0;

  if (variant === "card") {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground text-sm">
              {hasTeams ? "Join Another Team" : "Join a Team"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasTeams
                ? "Add another team to your training"
                : "Train with a team while keeping your solo workouts"}
            </p>

            {showInput ? (
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Enter invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="text-sm h-9"
                  onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
                />
                <Button
                  size="sm"
                  onClick={handleValidateCode}
                  disabled={isValidating}
                  className="shrink-0"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Join"
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-primary mt-2"
                onClick={() => setShowInput(true)}
              >
                Enter invite code
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {hasTeams && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Your teams:</p>
            <div className="flex flex-wrap gap-2">
              {existingTeams.map((membership) => (
                <button
                  key={membership.id}
                  onClick={() =>
                    navigate(`/player/today/${membership.team_id}/${playerId}`)
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <Users className="h-3 w-3" />
                  {(membership.teams as unknown as { name: string })?.name || "Team"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Section variant (for settings page)
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-foreground">
            {hasTeams ? "Your Teams" : "Join a Team"}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasTeams
              ? "You're training with a team while keeping your solo workouts"
              : "Got an invite code? Join a team while keeping your personal training."}
          </p>
        </div>
      </div>

      {hasTeams && (
        <div className="space-y-2">
          {existingTeams.map((membership) => (
            <button
              key={membership.id}
              onClick={() =>
                navigate(`/player/today/${membership.team_id}/${playerId}`)
              }
              className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {(membership.teams as unknown as { name: string })?.name || "Team"}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      <div className="pt-2">
        <p className="text-xs text-muted-foreground mb-2">
          {hasTeams ? "Join another team:" : "Have an invite code?"}
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
          />
          <Button onClick={handleValidateCode} disabled={isValidating}>
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Join
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
