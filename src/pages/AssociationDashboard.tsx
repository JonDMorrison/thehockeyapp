import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Link2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Unlink,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/app/Toast";
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

type AssociationRole = "owner" | "director" | "admin" | "viewer";
type TeamFilter = "all" | "needs_plan" | "low_adoption";

interface AssociationTeamMetric {
  id: string;
  name: string;
  season_label: string | null;
  age_division: string | null;
  level: string | null;
  team_logo_url: string | null;
  palette_id: string;
  can_open_team: boolean;
  players_count: number;
  staff_count: number;
  sessions_count: number;
  active_players_count: number;
  shots_count: number;
  has_published_week: boolean;
  adoption_percent: number;
}
interface AssociationDashboardData {
  association: {
    id: string;
    name: string;
    slug: string;
    season_label: string | null;
    region: string | null;
    status: string;
  };
  current_user_role: AssociationRole;
  window_days: number;
  totals: {
    teams_count: number;
    players_count: number;
    active_players_count: number;
    sessions_count: number;
    shots_count: number;
    teams_with_plan_count: number;
  };
  teams: AssociationTeamMetric[];
}

interface InviteResult {
  success?: boolean;
  token?: string;
  email?: string;
  role?: string;
}

const adminRoles = new Set<AssociationRole>(["owner", "director", "admin"]);

const formatNumber = (value: number) => new Intl.NumberFormat("en-CA").format(value || 0);

export default function AssociationDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [windowDays, setWindowDays] = useState(7);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [teamToDisconnect, setTeamToDisconnect] = useState<AssociationTeamMetric | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/auth", { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  const dashboardQuery = useQuery({
    queryKey: ["association-dashboard", id, windowDays],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_association_dashboard", {
        p_association_id: id!,
        p_days: windowDays,
      });
      if (error) throw error;
      return data as unknown as AssociationDashboardData;
    },
    enabled: !!user && !!id,
  });

  const dashboard = dashboardQuery.data;
  const canManage = dashboard ? adminRoles.has(dashboard.current_user_role) : false;

  const rolesQuery = useQuery({
    queryKey: ["association-roles", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("association_roles")
        .select("id, user_id, role, created_at")
        .eq("association_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const invitesQuery = useQuery({
    queryKey: ["association-invites", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("association_invites")
        .select("id, invited_email, role, status, expires_at, created_at")
        .eq("association_id", id!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id && canManage,
  });

  const headCoachTeamsQuery = useQuery({
    queryKey: ["association-linkable-teams", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_roles")
        .select("team_id, teams(id, name, season_label, team_logo_url)")
        .eq("user_id", user!.id)
        .eq("role", "head_coach");
      if (error) throw error;
      return data;
    },
    enabled: !!user && canManage,
  });

  const connectedIds = useMemo(() => new Set(dashboard?.teams.map((team) => team.id) || []), [dashboard?.teams]);
  const linkableTeams = useMemo(
    () => (headCoachTeamsQuery.data || []).filter((role) => role.teams && !connectedIds.has(role.team_id)),
    [connectedIds, headCoachTeamsQuery.data],
  );

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["association-dashboard", id] }),
      queryClient.invalidateQueries({ queryKey: ["association-roles", id] }),
      queryClient.invalidateQueries({ queryKey: ["association-invites", id] }),
    ]);
  }, [id, queryClient]);

  const linkTeam = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.rpc("add_team_to_association", {
        p_association_id: id!,
        p_team_id: teamId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team connected", "Its rollout totals are now included.");
      refresh();
    },
    onError: (error: Error) => toast.error("Could not connect team", error.message),
  });

  const unlinkTeam = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.rpc("remove_team_from_association", {
        p_association_id: id!,
        p_team_id: teamId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team disconnected", "The team workspace and its data were not deleted.");
      setTeamToDisconnect(null);
      refresh();
    },
    onError: (error: Error) => toast.error("Could not disconnect team", error.message),
  });

  const inviteStaff = useMutation({
    mutationFn: async () => {
      const normalizedEmail = inviteEmail.trim().toLowerCase();
      const { data, error } = await supabase.rpc("create_association_invite", {
        p_association_id: id!,
        p_email: normalizedEmail,
        p_role: inviteRole,
      });
      if (error) throw error;
      const result = data as unknown as InviteResult;
      if (!result.token) throw new Error("Invitation was not created");
      const inviteLink = `${window.location.origin}/association/join/${result.token}`;

      const { error: emailError } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          type: "association_invitation",
          to: normalizedEmail,
          data: {
            associationId: id,
            associationName: dashboard?.association.name,
            role: inviteRole,
            inviteLink,
          },
        },
      });

      return { inviteLink, emailSent: !emailError };
    },
    onSuccess: ({ inviteLink, emailSent }) => {
      setLastInviteLink(inviteLink);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["association-invites", id] });
      if (emailSent) toast.success("Invitation sent", "The access link is also ready to copy.");
      else toast.info("Invitation created", "Email is not configured yet; copy the secure link below.");
    },
    onError: (error: Error) => toast.error("Could not create invitation", error.message),
  });

  const copyLink = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied", "Invitation link copied to your clipboard.");
  };

  if (authLoading || dashboardQuery.isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer className="mx-auto max-w-6xl">
          <Skeleton className="h-48 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </PageContainer>
      </AppShell>
    );
  }

  if (!isAuthenticated) return null;

  if (dashboardQuery.error || !dashboard) {
    return (
      <AppShell hideNav>
        <PageContainer className="mx-auto max-w-2xl text-center">
          <AppCard>
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-4 text-xl font-black uppercase">Association unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">You do not have access, or this workspace no longer exists.</p>
            <Button className="mt-5" onClick={() => navigate("/associations")}>Back to associations</Button>
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  const adoption = dashboard.totals.players_count > 0
    ? Math.round((dashboard.totals.active_players_count / dashboard.totals.players_count) * 100)
    : 0;
  const teamsWithoutPlan = dashboard.teams.filter((team) => !team.has_published_week);
  const lowAdoptionTeams = dashboard.teams.filter((team) => team.adoption_percent < 50);
  const attentionTeamIds = new Set([...teamsWithoutPlan, ...lowAdoptionTeams].map((team) => team.id));
  const attentionCount = attentionTeamIds.size;
  const visibleTeams = dashboard.teams.filter((team) => {
    if (teamFilter === "needs_plan") return !team.has_published_week;
    if (teamFilter === "low_adoption") return team.adoption_percent < 50;
    return true;
  });

  return (
    <AppShell
      header={
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/associations")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Association HQ</p>
            <h1 className="truncate text-xl font-black uppercase tracking-tight">{dashboard.association.name}</h1>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Refresh" onClick={refresh}>
            <RefreshCw className={`h-4 w-4 ${dashboardQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    >
      <PageContainer className="mx-auto max-w-6xl space-y-5 sm:space-y-7">
        <section className="relative overflow-hidden rounded-xl border border-primary/30 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--background)))] p-5 sm:p-8">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-bold uppercase tracking-wide text-primary">{dashboard.association.status}</span>
                {dashboard.association.season_label && <span>{dashboard.association.season_label}</span>}
                {dashboard.association.region && <><span>·</span><span>{dashboard.association.region}</span></>}
              </div>
              <h2 className="mt-4 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-5xl">
                {attentionCount > 0 ? <>{attentionCount} team{attentionCount === 1 ? "" : "s"} need attention</> : <>Every team is on track</>}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                {attentionCount > 0
                  ? "Start with missing weekly plans and low participation. Player details stay inside each authorized team."
                  : `${formatNumber(dashboard.totals.active_players_count)} players were active across ${dashboard.totals.teams_count} teams in the last ${dashboard.window_days} days.`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="report-window" className="text-xs text-muted-foreground">Reporting window</Label>
              <Select value={String(windowDays)} onValueChange={(value) => setWindowDays(Number(value))}>
                <SelectTrigger id="report-window" className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-4 sm:divide-y-0">
          <Metric icon={Building2} label="Teams" value={dashboard.totals.teams_count} />
          <Metric icon={Activity} label="Adoption" value={`${adoption}%`} accent />
          <Metric icon={CalendarCheck2} label="Weeks live" value={`${dashboard.totals.teams_with_plan_count}/${dashboard.totals.teams_count}`} />
          <Metric icon={Users} label="Active players" value={dashboard.totals.active_players_count} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <AppCard id="association-teams" className="scroll-mt-24 overflow-hidden" contentClassName="p-0">
            <div className="border-b border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <AppCardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Team rollout</AppCardTitle>
                  <AppCardDescription className="mt-1">Find the teams that need support first.</AppCardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black">{visibleTeams.length}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">shown</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto" aria-label="Filter teams">
                {([
                  ["all", `All ${dashboard.teams.length}`],
                  ["needs_plan", `Needs plan ${teamsWithoutPlan.length}`],
                  ["low_adoption", `Low activity ${lowAdoptionTeams.length}`],
                ] as Array<[TeamFilter, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={teamFilter === value}
                    onClick={() => setTeamFilter(value)}
                    className={`min-h-10 shrink-0 rounded-md px-3 text-xs font-bold transition-colors ${teamFilter === value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {visibleTeams.length > 0 ? (
              <div className="divide-y divide-border">
                {visibleTeams.map((team) => (
                  <div key={team.id} className="group p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <Avatar src={team.team_logo_url} fallback={team.name} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-black uppercase tracking-tight">{team.name}</h3>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${team.has_published_week ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                            {team.has_published_week ? "Plan live" : "Plan needed"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[team.age_division, team.level, team.season_label].filter(Boolean).join(" · ") || "Team setup in progress"}
                        </p>
                      </div>
                      {team.can_open_team && (
                        <Button variant="ghost" size="icon-sm" aria-label={`Open ${team.name}`} onClick={() => navigate(`/teams/${team.id}`)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4">
                      <div>
                        <div className="mb-1.5 flex justify-between text-[11px]">
                          <span className="text-muted-foreground">{team.active_players_count} of {team.players_count} active</span>
                          <span className="font-bold text-foreground">{team.adoption_percent}%</span>
                        </div>
                        <Progress value={team.adoption_percent} className="h-1.5" />
                      </div>
                      <div className="flex gap-3 text-right text-xs">
                        <div><p className="font-black">{formatNumber(team.sessions_count)}</p><p className="text-[9px] uppercase text-muted-foreground">sessions</p></div>
                        <div><p className="font-black">{formatNumber(team.shots_count)}</p><p className="text-[9px] uppercase text-muted-foreground">shots</p></div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
                          disabled={unlinkTeam.isPending}
                          onClick={() => setTeamToDisconnect(team)}
                        >
                          <Unlink className="h-3.5 w-3.5" /> Disconnect
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                {dashboard.teams.length === 0 ? <Link2 className="mx-auto h-8 w-8 text-primary" /> : <CheckCircle2 className="mx-auto h-8 w-8 text-success" />}
                <h3 className="mt-3 font-black uppercase">{dashboard.teams.length === 0 ? "Connect the pilot team" : "No teams in this filter"}</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  {dashboard.teams.length === 0
                    ? "Connect an existing coach workspace without changing who can see player data."
                    : "Change the filter to see the rest of the association."}
                </p>
              </div>
            )}
          </AppCard>

          <div className="space-y-5">
            {canManage && (
              <AppCard>
                <AppCardTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Connect teams</AppCardTitle>
                <AppCardDescription className="mt-1">Only teams where you are head coach appear here.</AppCardDescription>
                <div className="mt-4 space-y-2">
                  {linkableTeams.length > 0 ? linkableTeams.map((role) => {
                    const team = role.teams;
                    if (!team) return null;
                    return (
                      <button
                        key={team.id}
                        className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                        onClick={() => linkTeam.mutate(team.id)}
                        disabled={linkTeam.isPending}
                      >
                        <Avatar src={team.team_logo_url} fallback={team.name} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{team.name}</span>
                        {linkTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  }) : (
                    <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      Create a team or ask its head coach to connect it.
                      <Button variant="link" size="sm" className="mt-1 w-full" onClick={() => navigate(`/teams/new?association=${id}`)}>Create a new team</Button>
                    </div>
                  )}
                </div>
              </AppCard>
            )}

            <AppCard id="association-access" className="scroll-mt-24">
              <AppCardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Staff access</AppCardTitle>
              <AppCardDescription className="mt-1">{rolesQuery.data?.length || 0} people can open this association view.</AppCardDescription>

              {canManage && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="association-email" className="text-xs">Invite by email</Label>
                    <Input
                      id="association-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value.slice(0, 320))}
                      placeholder="director@association.ca"
                    />
                  </div>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Reporting access</SelectItem>
                      <SelectItem value="director">Director</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="w-full"
                    variant="team"
                    disabled={inviteStaff.isPending || !inviteEmail.trim()}
                    onClick={() => inviteStaff.mutate()}
                  >
                    {inviteStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Send secure invite
                  </Button>
                  {lastInviteLink && (
                    <button className="flex w-full items-center gap-2 rounded-lg bg-muted p-2 text-left text-[11px]" onClick={() => copyLink(lastInviteLink)}>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{lastInviteLink}</span>
                      <Clipboard className="h-3.5 w-3.5 text-primary" />
                    </button>
                  )}
                  {(invitesQuery.data?.length || 0) > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pending</p>
                      {invitesQuery.data?.slice(0, 4).map((invite) => (
                        <div key={invite.id} className="flex items-center gap-2 text-xs">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{invite.invited_email}</span>
                          <span className="capitalize text-muted-foreground">{invite.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </AppCard>
          </div>
        </section>
      </PageContainer>

      <AlertDialog open={!!teamToDisconnect} onOpenChange={(open) => !open && setTeamToDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {teamToDisconnect?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The team workspace and player data will stay intact. Its totals will no longer appear in this association.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep connected</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={unlinkTeam.isPending || !teamToDisconnect}
              onClick={(event) => {
                event.preventDefault();
                if (teamToDisconnect) unlinkTeam.mutate(teamToDisconnect.id);
              }}
            >
              {unlinkTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
              Disconnect team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  accent = false,
  className = "",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`p-4 sm:p-5 ${accent ? "bg-primary/[0.06]" : "bg-card"} ${className}`}>
      <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <p className="mt-3 text-2xl font-black tracking-tight">{typeof value === "number" ? formatNumber(value) : value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
  );
}
