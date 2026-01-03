import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ArrowRight, Users, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Import the existing demo screens from Index
import {
  AppShell,
  PageContainer,
  PageHeader,
  AppCard,
  AppCardTitle,
  AppCardDescription,
  Tag,
  ProgressBar,
  ProgressRing,
  ChecklistItem,
  Avatar,
  EmptyState,
} from "@/components/app";
import {
  Target,
  Timer,
  Zap,
  Dumbbell,
  CheckCircle,
  UserPlus,
  Send,
  Calendar,
  Trophy,
  ChevronRight,
  Clock,
  WifiOff,
  Palette,
  Settings,
  RefreshCw,
  ClipboardList,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { teamPalettes } from "@/lib/themes";

// Coach Dashboard Demo
const CoachDashboardDemo: React.FC = () => {
  const { palette } = useTeamTheme();

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar fallback="TH" size="sm" />
            <div>
              <h1 className="text-lg font-bold">Toronto Hawks</h1>
              <p className="text-xs text-text-muted">Rep · U12</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon-sm">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      }
    >
      <PageContainer className="space-y-4">
        {/* Team Header */}
        <AppCard
          className="py-4"
          style={{
            background: palette
              ? `linear-gradient(135deg, hsl(${palette.primary} / 0.15), transparent)`
              : undefined,
          }}
        >
          <div className="flex items-center gap-4">
            <Avatar fallback="TH" size="lg" />
            <div>
              <h2 className="text-lg font-bold">Toronto Hawks</h2>
              <div className="flex items-center gap-2 mt-1">
                <Tag variant="accent" size="sm">
                  <Trophy className="w-3 h-3" />
                  Head Coach
                </Tag>
                <span className="text-xs text-text-muted">2024-25 Season</span>
              </div>
            </div>
          </div>
        </AppCard>

        {/* Setup Checklist */}
        <AppCard>
          <div className="flex items-center justify-between mb-4">
            <AppCardTitle className="text-base">Setup</AppCardTitle>
            <span className="text-sm text-text-muted">3/5 complete</span>
          </div>
          <ProgressBar value={3} max={5} size="sm" className="mb-4" />
          <div className="space-y-2">
            {[
              { label: "Choose training preferences", done: true },
              { label: "Connect TeamSnap schedule", done: true },
              { label: "Create invite link", done: true },
              { label: "Add players to roster", done: false },
              { label: "Publish today's practice", done: false },
            ].slice(3).map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted">
                <div className="w-5 h-5 rounded-full border-2 border-border" />
                <span className="flex-1 text-sm">{item.label}</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-team-primary">
                  {i === 0 ? "Invite" : "Publish"}
                </Button>
              </div>
            ))}
          </div>
        </AppCard>

        {/* Today Control Center */}
        <AppCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-team-primary" />
              <AppCardTitle className="text-base">Today</AppCardTitle>
            </div>
            <Tag variant="neutral" size="sm">Normal</Tag>
          </div>
          <p className="text-sm text-text-muted mb-3">Friday, January 3</p>
          <div className="p-3 rounded-lg bg-surface-muted mb-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium">Draft ready</span>
            </div>
            <span className="text-xs text-text-muted">Rep tier</span>
          </div>
          <div className="flex gap-2">
            <Button variant="default" className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              Publish today
            </Button>
          </div>
        </AppCard>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-auto py-3 flex-col gap-1">
            <UserPlus className="w-4 h-4 text-team-primary" />
            <span className="text-xs">Invite</span>
          </Button>
          <Button variant="outline" className="flex-1 h-auto py-3 flex-col gap-1">
            <Layers className="w-4 h-4 text-team-primary" />
            <span className="text-xs">Week Plan</span>
          </Button>
          <Button variant="outline" className="flex-1 h-auto py-3 flex-col gap-1">
            <Users className="w-4 h-4 text-team-primary" />
            <span className="text-xs">Roster</span>
          </Button>
        </div>

        {/* Team Pulse */}
        <AppCard>
          <AppCardTitle className="text-base mb-4">Team Pulse</AppCardTitle>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-surface-muted">
              <Users className="w-5 h-5 mx-auto mb-1 text-team-primary" />
              <p className="text-xl font-bold">14</p>
              <p className="text-xs text-text-muted">Players</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-surface-muted">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" />
              <p className="text-xl font-bold">8</p>
              <p className="text-xs text-text-muted">Complete</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-surface-muted">
              <Target className="w-5 h-5 mx-auto mb-1 text-team-primary" />
              <p className="text-xl font-bold">1.2k</p>
              <p className="text-xs text-text-muted">Shots</p>
            </div>
          </div>
        </AppCard>
      </PageContainer>
    </AppShell>
  );
};

// Player/Parent View Demo
const PlayerViewDemo: React.FC = () => {
  const [items, setItems] = useState([
    { id: "1", label: "Dynamic warm-up", target: "5 minutes", icon: Zap, completed: true },
    { id: "2", label: "Stickhandling drills", target: "30 reps", icon: Target, completed: true },
    { id: "3", label: "Wrist shots", target: "25 shots", icon: Target, completed: true },
    { id: "4", label: "Skating sprints", target: "60 seconds", icon: Timer, completed: false },
    { id: "5", label: "Cool down stretch", target: "5 minutes", icon: Dumbbell, completed: false },
  ]);

  const handleToggle = (id: string, completed: boolean) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed } : item))
    );
  };

  const completedCount = items.filter((i) => i.completed).length;

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Today</h1>
            <p className="text-xs text-text-muted">Friday Practice</p>
          </div>
          <div className="flex items-center gap-2">
            <Tag variant="tier">Rep</Tag>
          </div>
        </div>
      }
    >
      <PageContainer>
        {/* Progress summary */}
        <AppCard>
          <div className="flex items-center gap-4">
            <ProgressRing value={completedCount} max={items.length} size={56} />
            <div className="flex-1">
              <p className="text-lg font-bold">
                {completedCount} of {items.length} complete
              </p>
              <p className="text-sm text-text-muted">Daily training</p>
            </div>
          </div>
          <ProgressBar
            value={completedCount}
            max={items.length}
            className="mt-4"
          />
        </AppCard>

        {/* Player selector */}
        <div className="flex items-center justify-center gap-2">
          <Avatar fallback="JD" size="sm" />
          <span className="text-sm font-medium">Jake D.</span>
          <Tag variant="accent" size="sm">Toronto Hawks</Tag>
        </div>

        {/* Checklist */}
        <AppCard className="p-0 overflow-hidden">
          <div className="divide-y divide-border">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <ChecklistItem
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  target={item.target}
                  icon={<Icon className="w-5 h-5" />}
                  completed={item.completed}
                  onToggle={handleToggle}
                />
              );
            })}
          </div>
        </AppCard>

        {/* Offline indicator */}
        <Tag variant="offline" className="mx-auto" icon={<WifiOff className="w-3 h-3" />}>
          Saved on device
        </Tag>

        {/* Primary CTA */}
        <Button
          variant="team"
          size="xl"
          className="w-full"
          disabled={completedCount < items.length}
        >
          {completedCount === items.length ? "Session Complete!" : "Complete Session"}
        </Button>
      </PageContainer>
    </AppShell>
  );
};

const Demo: React.FC = () => {
  const [activeView, setActiveView] = useState<"coach" | "player">("coach");
  const { setTeamTheme } = useTeamTheme();

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              See PuckTrack in action
            </h1>
            <p className="text-lg text-muted-foreground">
              Explore the app from both perspectives—coach and parent/player.
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveView("coach")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all",
                  activeView === "coach"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="w-4 h-4" />
                Coach View
              </button>
              <button
                onClick={() => setActiveView("player")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all",
                  activeView === "player"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserCircle className="w-4 h-4" />
                Parent/Player View
              </button>
            </div>
          </div>

          {/* Team Color Picker */}
          <div className="flex justify-center gap-2 mb-8">
            <span className="text-sm text-muted-foreground mr-2">Team colors:</span>
            {teamPalettes.slice(0, 6).map((p) => (
              <button
                key={p.id}
                onClick={() => setTeamTheme(p.id)}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: `hsl(${p.primary})` }}
                title={p.displayName}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Demo Container */}
      <section className="pb-16 lg:pb-24">
        <div className="max-w-lg mx-auto px-4">
          <div className="relative">
            {/* Phone Frame */}
            <div className="bg-foreground rounded-[3rem] p-3 shadow-elevated">
              <div className="bg-background rounded-[2.5rem] overflow-hidden">
                {/* Notch */}
                <div className="relative h-8 bg-foreground flex justify-center">
                  <div className="absolute top-2 w-24 h-6 bg-foreground rounded-b-2xl" />
                </div>
                
                {/* Screen Content */}
                <div className="h-[600px] overflow-y-auto">
                  {activeView === "coach" ? (
                    <CoachDashboardDemo />
                  ) : (
                    <PlayerViewDemo />
                  )}
                </div>

                {/* Home indicator */}
                <div className="h-8 flex justify-center items-center">
                  <div className="w-32 h-1 bg-foreground/20 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8 text-center">
            {activeView === "coach" ? (
              <>
                <h3 className="text-xl font-bold mb-2">Coach Dashboard</h3>
                <p className="text-muted-foreground">
                  Your daily control center. See team progress, publish practice cards, 
                  and manage game days—all from one screen.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-2">Player Practice Card</h3>
                <p className="text-muted-foreground">
                  Simple, focused checklists. Parents see exactly what to practice. 
                  Works offline at the rink.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to try it with your team?
          </h2>
          <p className="text-muted-foreground mb-8">
            Free for coaches. Takes less than 5 minutes to set up.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/features">See All Features</Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Demo;
