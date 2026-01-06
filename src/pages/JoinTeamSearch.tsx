import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "code">("search");

  // Search teams by name
  const { data: teams, isLoading, isFetching } = useQuery({
    queryKey: ["team-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
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
        .ilike("name", `%${searchQuery}%`)
        .eq("team_invites.status", "active")
        .gt("team_invites.expires_at", new Date().toISOString())
        .limit(10);

      if (error) throw error;

      // Transform to include token
      return (data || []).map((team: any) => ({
        id: team.id,
        name: team.name,
        season_label: team.season_label,
        team_logo_url: team.team_logo_url,
        team_photo_url: team.team_photo_url,
        palette_id: team.palette_id,
        invite_token: team.team_invites?.[0]?.token || null,
      })) as TeamResult[];
    },
    enabled: searchQuery.length >= 2,
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
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Join a Team</h1>
            <p className="text-sm text-muted-foreground">Find your team to start training</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "search"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="w-4 h-4 inline-block mr-2" />
            Search
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "code"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link2 className="w-4 h-4 inline-block mr-2" />
            Invite Code
          </button>
        </div>

        {activeTab === "search" ? (
          <>
            {/* Search Input */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by team name..."
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
            ) : searchQuery.length < 2 ? (
              <AppCard className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Type at least 2 characters to search for teams
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
                  title="No teams found"
                  description="Try a different search term or ask your coach for an invite code."
                />
              </AppCard>
            )}
          </>
        ) : (
          <>
            {/* Invite Code Input */}
            <AppCard className="mb-6">
              <AppCardTitle className="text-lg mb-2">Have an invite code?</AppCardTitle>
              <AppCardDescription className="mb-4">
                Your coach may have shared an invite link or code. Paste it below.
              </AppCardDescription>
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Paste invite code or link..."
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
                  Join with Code
                </Button>
              </div>
            </AppCard>

            <p className="text-sm text-muted-foreground text-center">
              Don't have a code? Switch to Search to find your team.
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
                <h3 className="font-semibold mb-1">Not on a team?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Train on your own and track your progress without a coach.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link to="/solo/setup">
                    Train On My Own
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