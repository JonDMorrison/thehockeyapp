import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Users,
  ChevronRight,
  Link2,
  ArrowLeft,
  Dumbbell
} from "lucide-react";

interface TeamResult {
  id: string;
  name: string;
  season_label: string | null;
  team_logo_url: string | null;
  team_photo_url: string | null;
  palette_id: string;
  invite_token: string | null;
}

const JoinTeamSearch: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "code">("search");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search teams by name
  const { data: teams, isLoading, isFetching } = useQuery({
    queryKey: ["team-search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];

      // Search for teams with active invites
      const { data, error } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          season_label,
          team_logo_url,
          team_photo_url,
          palette_id,
          team_invites!inner(token, status, expires_at)
        `)
        .ilike("name", `%${debouncedSearch}%`)
        .eq("team_invites.status", "active")
        .gt("team_invites.expires_at", new Date().toISOString())
        .limit(10);

      if (error) throw error;

      // Transform to include token
      return (data || []).map((team: { id: string; name: string; season_label: string | null; team_logo_url: string | null; team_photo_url: string | null; palette_id: string; team_invites: Array<{ token: string }> }) => ({
        id: team.id,
        name: team.name,
        season_label: team.season_label,
        team_logo_url: team.team_logo_url,
        team_photo_url: team.team_photo_url,
        palette_id: team.palette_id,
        invite_token: team.team_invites?.[0]?.token || null,
      })) as TeamResult[];
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 30000,
  });

  const handleJoinWithCode = () => {
    if (!inviteCode.trim()) return;
    // Navigate to join page with token
    navigate(`/join/${inviteCode.trim()}`);
  };

  const handleSelectTeam = (team: TeamResult) => {
    if (team.invite_token) {
      navigate(`/join/${team.invite_token}`);
    }
  };

  return (
    <AppShell hideNav>
      <PageContainer className="min-h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/welcome")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t("auth.joinTeamSearch.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.joinTeamSearch.subtitle")}</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div role="tablist" className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
          <button
            role="tab"
            aria-selected={activeTab === "search"}
            onClick={() => setActiveTab("search")}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "search"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="w-4 h-4 inline-block mr-2" />
            {t("auth.joinTeamSearch.searchTab")}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "code"}
            onClick={() => setActiveTab("code")}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "code"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link2 className="w-4 h-4 inline-block mr-2" />
            {t("auth.joinTeamSearch.inviteCodeTab")}
          </button>
        </div>

        {activeTab === "search" ? (
          <>
            {/* Search Input */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("auth.joinTeamSearch.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
                autoFocus
              />
            </div>

            {/* Search Results */}
            {isLoading || isFetching ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : debouncedSearch.length < 2 ? (
              <AppCard className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {t("auth.joinTeamSearch.searchHint")}
                </p>
              </AppCard>
            ) : teams && teams.length > 0 ? (
              <div className="space-y-3">
                {teams.map((team) => (
                  <AppCard
                    key={team.id}
                    className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                    onClick={() => handleSelectTeam(team)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={team.team_logo_url || team.team_photo_url}
                        fallback={team.name}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{team.name}</p>
                        {team.season_label && (
                          <p className="text-sm text-muted-foreground">
                            {team.season_label}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </AppCard>
                ))}
              </div>
            ) : (
              <AppCard>
                <EmptyState
                  icon={Users}
                  title={t("auth.joinTeamSearch.noTeamsTitle")}
                  description={t("auth.joinTeamSearch.noTeamsDescription")}
                />
              </AppCard>
            )}
          </>
        ) : (
          <>
            {/* Invite Code Input */}
            <AppCard className="mb-6">
              <AppCardTitle className="text-lg mb-2">{t("auth.joinTeamSearch.haveInviteCodeTitle")}</AppCardTitle>
              <AppCardDescription className="mb-4">
                {t("auth.joinTeamSearch.haveInviteCodeDescription")}
              </AppCardDescription>
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder={t("auth.joinTeamSearch.inviteCodePlaceholder")}
                  value={inviteCode}
                  onChange={(e) => {
                    // Extract code from URL if pasted
                    const value = e.target.value;
                    const match = value.match(/\/join\/([a-zA-Z0-9-]+)/);
                    setInviteCode(match ? match[1] : value);
                  }}
                  className="h-12 text-base"
                  autoFocus
                />
                <Button
                  variant="default"
                  size="lg"
                  className="w-full"
                  onClick={handleJoinWithCode}
                  disabled={!inviteCode.trim()}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  {t("auth.joinTeamSearch.joinWithCodeButton")}
                </Button>
              </div>
            </AppCard>

            <p className="text-sm text-muted-foreground text-center">
              {t("auth.joinTeamSearch.noCodeHint")}
            </p>
          </>
        )}

        {/* Train On My Own Option */}
        <div className="mt-8 pt-6 border-t border-border">
          <AppCard className="bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t("auth.joinTeamSearch.notOnTeamTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("auth.joinTeamSearch.notOnTeamDescription")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link to="/solo/setup">
                    {t("auth.joinTeamSearch.trainOnMyOwnButton")}
                    <ChevronRight className="w-4 h-4 ml-1" />
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
