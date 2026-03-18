import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/app/Toast";
import { Loader2, Shield, AlertCircle, CheckCircle, UserPlus } from "lucide-react";

const GuardianJoin: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [redeemStatus, setRedeemStatus] = useState<"idle" | "success" | "error">("idle");

  // Fetch invite details (public read allowed by token)
  const { data: invite, isLoading: inviteLoading, error: inviteError } = useQuery({
    queryKey: ["guardian-invite", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_guardian_invites")
        .select(`
          *,
          players(first_name, last_initial)
        `)
        .eq("token", token)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  // Check if invite is valid
  const isExpired = invite?.expires_at && new Date(invite.expires_at) < new Date();
  const isRevoked = invite?.status === "revoked";
  const isAlreadyAccepted = invite?.status === "accepted";
  const isValid = invite && !isExpired && !isRevoked && !isAlreadyAccepted;

  // Redeem invite mutation
  const redeemInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("redeem_guardian_invite", {
        invite_token: token,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; player_id?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to redeem invite");
      }

      return result;
    },
    onSuccess: (result) => {
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

  // Auto-redeem when authenticated and invite is valid
  useEffect(() => {
    if (isAuthenticated && isValid && redeemStatus === "idle" && !redeemInvite.isPending) {
      redeemInvite.mutate();
    }
  }, [isAuthenticated, isValid, redeemStatus]);

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
  if (inviteError || !invite) {
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

  const playerName = invite.players?.first_name
    ? `${invite.players.first_name}${invite.players.last_initial ? ` ${invite.players.last_initial}.` : ""}`
    : t("auth.guardianJoin.aPlayerFallback");

  // Not authenticated - prompt login
  if (!isAuthenticated) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard className="text-center">
              <div className="w-16 h-16 rounded-full bg-team-primary/10 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-team-primary" />
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
                  onClick={() => navigate("/auth")}
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

  // Authenticated and redeeming
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
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-team-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-team-primary" />
                </div>
                <AppCardTitle className="text-xl mb-2">{t("auth.guardianJoin.joiningTitle")}</AppCardTitle>
                <AppCardDescription className="mb-4">
                  {t("auth.guardianJoin.joiningMessage", { playerName })}
                </AppCardDescription>
                <Loader2 className="w-8 h-8 animate-spin text-team-primary mx-auto" />
              </>
            )}
          </AppCard>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default GuardianJoin;
