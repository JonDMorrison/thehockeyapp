import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ChevronRight, Dumbbell, KeyRound, ShieldCheck, Users } from "lucide-react";

const JoinTeamSearch: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");

  const normalizedCode = inviteCode.trim();

  const handleJoin = () => {
    if (normalizedCode) navigate(`/join/${encodeURIComponent(normalizedCode)}`);
  };

  return (
    <AppShell hideNav>
      <PageContainer className="min-h-screen">
        <div className="mx-auto w-full max-w-lg py-4 sm:py-10">
          <Button variant="ghost" size="sm" onClick={() => navigate("/welcome")} className="mb-5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/10 p-6 shadow-xl sm:p-8">
            <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <KeyRound className="h-7 w-7" />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Private team access</p>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("auth.joinTeamSearch.title")}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Enter the team code from your coach, or paste the full invite link. Team names and rosters are not publicly searchable.
              </p>

              <div className="mt-7 space-y-3">
                <Input
                  type="text"
                  aria-label="Team invite code or link"
                  placeholder={t("auth.joinTeamSearch.inviteCodePlaceholder")}
                  value={inviteCode}
                  onChange={(event) => {
                    const value = event.target.value;
                    const match = value.match(/\/join\/([^/?#]+)/);
                    setInviteCode(match ? decodeURIComponent(match[1]) : value.toUpperCase());
                  }}
                  onKeyDown={(event) => event.key === "Enter" && handleJoin()}
                  className="h-14 border-border/80 bg-background/80 px-4 font-mono text-base uppercase tracking-wider"
                  autoFocus
                />
                <Button size="lg" className="h-14 w-full" onClick={handleJoin} disabled={!normalizedCode}>
                  <Users className="h-4 w-4" />
                  {t("auth.joinTeamSearch.joinWithCodeButton")}
                </Button>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-border/70 bg-background/45 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Codes expire and can be replaced by team staff. Ask your coach or manager if yours no longer works.
                </p>
              </div>
            </div>
          </div>

          <AppCard className="mt-5 border-border/70 bg-card/80">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <AppCardTitle className="text-base">{t("auth.joinTeamSearch.notOnTeamTitle")}</AppCardTitle>
                <AppCardDescription className="mt-1 mb-3">
                  {t("auth.joinTeamSearch.notOnTeamDescription")}
                </AppCardDescription>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/solo/setup">
                    {t("auth.joinTeamSearch.trainOnMyOwnButton")}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </AppCard>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default JoinTeamSearch;
