import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/app/Toast";
import { Loader2, Shield, AlertCircle, CheckCircle, UserPlus } from "lucide-react";

const GuardianJoin: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { setActiveView, setActivePlayerId } = useActiveView();
  const [redeemStatus, setRedeemStatus] = useState<"idle" | "success" | "error">("idle");
  const [relationshipConfirmed, setRelationshipConfirmed] = useState(false);

  // Token-scoped preview returns only the details needed for this screen.
  const { data: invite, isLoading: inviteLoading, error: inviteError } = useQuery({
    queryKey: ["guardian-invite", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("preview_guardian_invite", {
        p_token: token,
      });

      if (error) throw error;
      return data as unknown as {
        success: boolean;
        error?: string;
        status?: string;
        expires_at?: string;
        player_name?: string;
        email_domain?: string;
      };
    },
    enabled: !!token,
  });

  // Check if invite is valid
  const isExpired = invite?.expires_at && new Date(invite.expires_at) < new Date();
  const isRevoked = invite?.status === "revoked";
  const isAlreadyAccepted = invite?.status === "accepted";

  // Redeem invite mutation
  const redeemInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("redeem_guardian_invite", {
        invite_token: token,
        p_relationship_confirmed: relationshipConfirmed,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; player_id?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to redeem invite");
      }

      return result;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["user-guardian-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["welcome-check"] });
      if (result.player_id) {
        setActiveView("parent");
        setActivePlayerId(result.player_id);
      }
      setRedeemStatus("success");
      toast.success(t("auth.guardianJoin.successTitle"), t("auth.guardianJoin.successMessage"));
      setTimeout(() => {
        navigate(`/players/${result.player_id}`, { replace: true });
      }, 1500);
    },
    onError: (error: Error) => {
      setRedeemStatus("error");
      toast.error(t("auth.guardianJoin.failedToJoinTitle"), error.message);
    },
  });

  if (inviteLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <SkeletonCard />
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  // Invalid or not found
  if (inviteError || !invite?.success) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard>
              <EmptyState
                icon={AlertCircle}
                title={t("auth.invite.invalidTitle")}
                description={t("auth.invite.invalidDescription")}
                action={{
                  label: t("common.goHome"),
                  onClick: () => navigate("/"),
                }}
              />
            </AppCard>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  // Expired
  if (isExpired) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard>
              <EmptyState
                icon={AlertCircle}
                title={t("auth.invite.expiredTitle")}
                description={t("auth.guardianJoin.expiredDescription")}
                action={{
                  label: t("common.goHome"),
                  onClick: () => navigate("/"),
                }}
              />
            </AppCard>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  // Revoked
  if (isRevoked) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard>
              <EmptyState
                icon={AlertCircle}
                title={t("auth.invite.revokedTitle")}
                description={t("auth.guardianJoin.revokedDescription")}
                action={{
                  label: t("common.goHome"),
                  onClick: () => navigate("/"),
                }}
              />
            </AppCard>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  // Already accepted
  if (isAlreadyAccepted) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard>
              <EmptyState
                icon={CheckCircle}
                title={t("auth.invite.alreadyAcceptedTitle")}
                description={t("auth.invite.alreadyAcceptedDescription")}
                action={{
                  label: t("auth.guardianJoin.viewPlayersButton"),
                  onClick: () => navigate("/players"),
                }}
              />
            </AppCard>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  const playerName = invite.player_name || t("auth.guardianJoin.aPlayerFallback");

  // Not authenticated - prompt login
  if (!isAuthenticated) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <AppCardTitle className="text-xl mb-2">{t("auth.guardianJoin.inviteTitle")}</AppCardTitle>
              <AppCardDescription className="mb-6">
                {t("auth.guardianJoin.invitePrompt", { playerName })}
              </AppCardDescription>
              <div className="space-y-3">
                <Button
                  variant="team"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate(`/auth?redirect=${encodeURIComponent(`/guardian/join/${token}`)}`)}
                >
                  {t("auth.signInOrCreateAccount")}
                </Button>
              </div>
            </AppCard>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  // Authenticated: require an explicit relationship acknowledgement before
  // adding access to a child's profile.
  return (
    <AppShell hideNav>
      <PageContainer className="min-h-screen flex items-center justify-center">
        <div className="max-w-sm w-full">
          <AppCard className="text-center">
            {redeemStatus === "success" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <AppCardTitle className="text-xl mb-2">{t("auth.invite.youreInTitle")}</AppCardTitle>
                <AppCardDescription>
                  {t("auth.guardianJoin.redirectingMessage", { playerName })}
                </AppCardDescription>
              </>
            ) : redeemStatus === "error" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <AppCardTitle className="text-xl mb-2">{t("common.somethingWentWrong")}</AppCardTitle>
                <AppCardDescription className="mb-4">
                  {t("auth.guardianJoin.couldNotAddMessage")}
                </AppCardDescription>
                <Button
                  variant="team"
                  onClick={() => {
                    setRedeemStatus("idle");
                    redeemInvite.mutate();
                  }}
                >
                  {t("common.tryAgain")}
                </Button>
              </>
            ) : redeemInvite.isPending ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <AppCardTitle className="text-xl mb-2">{t("auth.guardianJoin.joiningTitle")}</AppCardTitle>
                <AppCardDescription className="mb-4">
                  {t("auth.guardianJoin.joiningMessage", { playerName })}
                </AppCardDescription>
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <AppCardTitle className="text-xl mb-2">Confirm guardian access</AppCardTitle>
                <AppCardDescription className="mb-5">
                  You were invited to help manage {playerName}. Sign in with the invited email address to continue.
                </AppCardDescription>
                <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-left text-sm">
                  <Checkbox
                    checked={relationshipConfirmed}
                    onCheckedChange={(checked) => setRelationshipConfirmed(checked === true)}
                    className="mt-0.5"
                  />
                  <span>I confirm I am a parent or legal guardian authorized to manage this player profile.</span>
                </label>
                <Button
                  variant="team"
                  size="lg"
                  className="mt-4 w-full"
                  disabled={!relationshipConfirmed}
                  onClick={() => redeemInvite.mutate()}
                >
                  Accept guardian access
                </Button>
              </>
            )}
          </AppCard>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default GuardianJoin;
