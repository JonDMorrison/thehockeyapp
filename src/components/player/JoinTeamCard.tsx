import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/app/Avatar";
import { toast } from "@/components/app/Toast";
import { Users, ArrowRight, Loader2, Check } from "lucide-react";

interface TeamPreview {
  team_id: string;
  team_name: string;
  team_logo_url: string | null;
  team_photo_url: string | null;
  palette_id: string;
  season_label: string | null;
  invite_token: string;
}

interface JoinTeamCardProps {
  playerId: string;
}

export const JoinTeamCard: React.FC<JoinTeamCardProps> = ({ playerId }) => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [teamPreview, setTeamPreview] = useState<TeamPreview | null>(null);

  // Validate and preview team by code
  const previewMutation = useMutation({
    mutationFn: async (code: string) => {
      // Try short code first
      const { data: shortCodeResult } = await supabase.rpc(
        "preview_team_by_short_code",
        { p_short_code: code.trim() }
      );

      const shortCodeData = shortCodeResult as {
        success: boolean;
        team_id?: string;
        team_name?: string;
        team_logo_url?: string | null;
        team_photo_url?: string | null;
        palette_id?: string;
        season_label?: string | null;
        invite_token?: string;
        error?: string;
      } | null;

      if (shortCodeData?.success) {
        return shortCodeData;
      }

      // Fall back to full token
      const { data: tokenResult } = await supabase.rpc(
        "preview_team_by_invite",
        { invite_token: code.trim() }
      );

      const tokenData = tokenResult as {
        success: boolean;
        team_id?: string;
        team_name?: string;
        team_logo_url?: string | null;
        team_photo_url?: string | null;
        palette_id?: string;
        season_label?: string | null;
        invite_token?: string;
        error?: string;
      } | null;

      if (tokenData?.success) {
        return { ...tokenData, invite_token: code.trim() };
      }

      throw new Error("Invalid or expired code");
    },
    onSuccess: (data) => {
      if (data.team_id && data.team_name) {
        setTeamPreview({
          team_id: data.team_id,
          team_name: data.team_name,
          team_logo_url: data.team_logo_url ?? null,
          team_photo_url: data.team_photo_url ?? null,
          palette_id: data.palette_id ?? "",
          season_label: data.season_label ?? null,
          invite_token: data.invite_token ?? "",
        });
      }
    },
    onError: () => {
      toast.error("Invalid code", "Check the code and try again.");
    },
  });

  // Join team mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!teamPreview) throw new Error("No team selected");

      const { data, error } = await supabase.rpc("join_team_with_invite", {
        invite_token: teamPreview.invite_token,
        p_player_id: playerId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; team_id?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to join team");
      }

      return result;
    },
    onSuccess: (data) => {
      toast.success("Joined team!", "You're now on the roster.");
      // Navigate to team context for this player
      navigate(`/player/today/${data.team_id}/${playerId}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to join", error.message);
    },
  });

  const handleValidate = () => {
    if (!inviteCode.trim()) {
      toast.error("Enter a code", "Ask your coach for the team code.");
      return;
    }
    previewMutation.mutate(inviteCode);
  };

  const handleReset = () => {
    setTeamPreview(null);
    setInviteCode("");
  };

  // Team preview state - show join confirmation
  if (teamPreview) {
    return (
      <AppCard className="border-team-primary/30 bg-team-primary/5">
        <div className="flex items-center gap-3">
          <Avatar
            src={teamPreview.team_logo_url || teamPreview.team_photo_url}
            fallback={teamPreview.team_name}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{teamPreview.team_name}</p>
            {teamPreview.season_label && (
              <p className="text-sm text-muted-foreground">{teamPreview.season_label}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={joinMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="team"
            size="sm"
            className="flex-1"
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Join Team
              </>
            )}
          </Button>
        </div>
      </AppCard>
    );
  }

  // Input state
  if (showInput) {
    return (
      <AppCard>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground text-sm mb-1">
              Enter Team Code
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Enter the code from your coach (e.g., EAGLES-1234)
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="TEAM-0000"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="text-sm h-9 font-mono uppercase"
                onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleValidate}
                disabled={previewMutation.isPending}
                className="shrink-0"
              >
                {previewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Join"
                )}
              </Button>
            </div>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-muted-foreground mt-2"
              onClick={() => setShowInput(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </AppCard>
    );
  }

  // Default collapsed state
  return (
    <AppCard className="cursor-pointer hover:shadow-medium transition-shadow" onClick={() => setShowInput(true)}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground text-sm">
            Join a Team
          </h3>
          <p className="text-xs text-muted-foreground">
            Have an invite code from your coach?
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </AppCard>
  );
};
