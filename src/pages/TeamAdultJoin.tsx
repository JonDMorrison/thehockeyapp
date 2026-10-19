import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import {
  AppCard,
  AppCardTitle,
  AppCardDescription,
} from "@/components/app/AppCard";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/app/Toast";
import { Loader2, Shield, AlertCircle, CheckCircle, Users } from "lucide-react";

const roleLabels: Record<string, string> = {
  head_coach: "Head Coach",
  assistant_coach: "Assistant Coach",
  manager: "Manager",
};

const TeamAdultJoin: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setActiveView, setActiveTeamId } = useActiveView();
  const [redeemStatus, setRedeemStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  // Fetch invite details
  const {
    data: invite,
    isLoading: inviteLoading,
    error: inviteError,
    refetch: retryInvite,
  } = useQuery({
    queryKey: ["team-adult-invite", token, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("preview_team_adult_invite", {
        p_token: token,
      });

      if (error) throw error;
      return data as unknown as {
        success: boolean;
        error?: string;
        team_name?: string;
        role?: string;
        status?: string;
        expires_at?: string;
        email_domain?: string;
        invitation_kind?: "email" | "link";
        already_member?: boolean;
        team_id?: string;
      };
    },
    enabled: !!token,
  });

  const isExpired =
    invite?.expires_at && new Date(invite.expires_at) < new Date();
  const isRevoked = invite?.status === "revoked";
  const isAlreadyAccepted = invite?.status === "accepted";

  // Redeem invite
  const redeemInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("redeem_team_adult_invite", {
        invite_token: token,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        team_id?: string;
      };
      if (!result.success) {
        throw new Error(result.error || "Failed to redeem invite");
      }

      return result;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["user-coach-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["welcome-check"] });
      if (result.team_id) {
        setActiveView("coach");
        setActiveTeamId(result.team_id);
      }
      setRedeemStatus("success");
      toast.success(
        t("auth.teamAdultJoin.welcomeTitle"),
        t("auth.teamAdultJoin.welcomeMessage"),
      );
      navigate(`/teams/${result.team_id}`, { replace: true });
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

  if (inviteError) {
    return (
      <AppShell hideNav>
        <PageContainer className="flex min-h-[80dvh] items-center justify-center">
          <AppCard className="w-full max-w-sm text-center">
            <div role="alert">
              <AppCardTitle>Couldn’t load invitation</AppCardTitle>
              <AppCardDescription className="my-4">
                Your link is still here. Try loading it again.
              </AppCardDescription>
            </div>
            <Button
              className="min-h-12 w-full"
              onClick={() => void retryInvite()}
            >
              Retry invitation
            </Button>
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }
  if (!invite?.success) {
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

  if (invite.already_member && invite.team_id) {
    return (
      <AppShell hideNav>
        <PageContainer className="flex min-h-[80dvh] items-center justify-center">
          <AppCard className="w-full max-w-sm text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-success" />
            <AppCardTitle>You’re on the team</AppCardTitle>
            <AppCardDescription className="my-4">
              Open {invite.team_name}’s coaching workspace.
            </AppCardDescription>
            <Button
              className="min-h-12 w-full"
              onClick={() => {
                setActiveView("coach");
                setActiveTeamId(invite.team_id!);
                navigate(`/teams/${invite.team_id}`, { replace: true });
              }}
            >
              Open coaching dashboard
            </Button>
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  if (isExpired) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard>
              <EmptyState
                icon={AlertCircle}
                title={t("auth.invite.expiredTitle")}
                description={t("auth.teamAdultJoin.expiredDescription")}
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

  if (isRevoked) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard>
              <EmptyState
                icon={AlertCircle}
                title={t("auth.invite.revokedTitle")}
                description={t("auth.teamAdultJoin.revokedDescription")}
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
                  label: t("auth.teamAdultJoin.viewTeamsButton"),
                  onClick: () => navigate("/teams"),
                }}
              />
            </AppCard>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  const teamName = invite.team_name || t("auth.teamAdultJoin.theTeamFallback");

  if (!isAuthenticated) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard className="break-words text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <AppCardTitle className="text-xl mb-2">
                {t("auth.teamAdultJoin.inviteTitle")}
              </AppCardTitle>
              <AppCardDescription className="mb-4">
                Join {teamName}’s coaching workspace to see plans, roster,
                shooting challenges and team progress.{" "}
                {invite.invitation_kind === "link"
                  ? "Sign in or create an account to accept this private, single-use invitation."
                  : "Use the email address that received this invitation."}
              </AppCardDescription>
              <Button
                variant="team"
                size="lg"
                className="w-full"
                onClick={() =>
                  navigate(
                    `/auth?redirect=${encodeURIComponent(`/team/adult/join/${token}`)}`,
                  )
                }
              >
                {t("auth.signInOrCreateAccount")}
              </Button>
            </AppCard>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav>
      <PageContainer className="min-h-screen flex items-center justify-center">
        <div className="max-w-sm w-full">
          <AppCard className="break-words text-center">
            {redeemStatus === "success" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <AppCardTitle className="text-xl mb-2">
                  {t("auth.invite.youreInTitle")}
                </AppCardTitle>
                <AppCardDescription>
                  {t("auth.teamAdultJoin.joinedRedirectingMessage", {
                    teamName,
                  })}
                </AppCardDescription>
              </>
            ) : redeemStatus === "error" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <AppCardTitle className="text-xl mb-2">
                  {t("common.somethingWentWrong")}
                </AppCardTitle>
                <AppCardDescription className="mb-4">
                  {redeemInvite.error instanceof Error
                    ? redeemInvite.error.message
                    : t("auth.teamAdultJoin.couldNotAddMessage")}
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
                <AppCardTitle className="text-xl mb-2">
                  {t("auth.teamAdultJoin.joiningTitle")}
                </AppCardTitle>
                <AppCardDescription className="mb-4">
                  {t("auth.teamAdultJoin.joiningMessage", {
                    teamName,
                    role: roleLabels[invite.role || ""] || "Team Staff",
                  })}
                </AppCardDescription>
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <AppCardTitle className="text-xl mb-2">
                  Join {teamName}
                </AppCardTitle>
                <AppCardDescription className="mb-5">
                  Coaches and managers share one dashboard for plans, roster,
                  challenges and progress.{" "}
                  {invite.invitation_kind === "link"
                    ? "This private link can be accepted once."
                    : "Use the email address that received this invitation."}
                </AppCardDescription>
                <Button
                  variant="team"
                  size="lg"
                  className="w-full"
                  onClick={() => redeemInvite.mutate()}
                >
                  Join coaching workspace
                </Button>
              </>
            )}
            {invite.invitation_kind !== "link" &&
              redeemStatus !== "success" && (
                <Button
                  variant="ghost"
                  className="mt-4 min-h-11 w-full"
                  disabled={redeemInvite.isPending}
                  onClick={async () => {
                    await supabase.auth.signOut({ scope: "local" });
                    navigate(
                      `/auth?mode=signin&redirect=${encodeURIComponent(`/team/adult/join/${token}`)}`,
                    );
                  }}
                >
                  Use a different account
                </Button>
              )}
          </AppCard>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default TeamAdultJoin;
