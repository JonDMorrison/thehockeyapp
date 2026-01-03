import React, { useState } from "react";
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
  SkeletonCard,
  SkeletonListItem,
  toast,
} from "@/components/app";
import { Button } from "@/components/ui/button";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { teamPalettes } from "@/lib/themes";
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
} from "lucide-react";

// Reference Screen: Team Home
const TeamHomeScreen: React.FC = () => {
  const { palette, setTeamTheme, currentTheme } = useTeamTheme();
  const [showPalettePicker, setShowPalettePicker] = useState(false);

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-team-primary/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-team-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{palette.displayName} Hawks</h1>
              <p className="text-xs text-text-muted">Rep · U12</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowPalettePicker(!showPalettePicker)}
          >
            <Palette className="w-5 h-5" />
          </Button>
        </div>
      }
    >
      <PageContainer>
        {/* Palette Picker (for demo) */}
        {showPalettePicker && (
          <AppCard className="animate-fade-up">
            <AppCardTitle className="text-base mb-3">Team Colors</AppCardTitle>
            <div className="grid grid-cols-5 gap-2">
              {teamPalettes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTeamTheme(p.id)}
                  className={`w-full aspect-square rounded-lg transition-all duration-200 ${
                    currentTheme === p.id
                      ? "ring-2 ring-team-primary ring-offset-2"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: `hsl(${p.primary})` }}
                  title={p.displayName}
                />
              ))}
            </div>
          </AppCard>
        )}

        {/* Today's Preview Card */}
        <AppCard className="animate-fade-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AppCardTitle>Today</AppCardTitle>
                <Tag variant="gameday" icon={<Calendar className="w-3 h-3" />}>
                  Game Day
                </Tag>
              </div>
              <AppCardDescription>Pre-game routine</AppCardDescription>
            </div>
            <ProgressRing value={60} size={48} />
          </div>

          <ProgressBar value={3} max={5} size="sm" className="mb-4" />

          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />3 of 5 completed
            </span>
            <span className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              ~15 min left
            </span>
          </div>

          <Button variant="team" size="lg" className="w-full mt-4">
            Continue Session
          </Button>
        </AppCard>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="action"
              className="flex-col h-auto py-4 gap-2"
            >
              <UserPlus className="w-5 h-5 text-team-primary" />
              <span className="text-xs">Invite</span>
            </Button>
            <Button
              variant="action"
              className="flex-col h-auto py-4 gap-2"
            >
              <Send className="w-5 h-5 text-team-primary" />
              <span className="text-xs">Publish</span>
            </Button>
            <Button
              variant="action"
              className="flex-col h-auto py-4 gap-2"
            >
              <Calendar className="w-5 h-5 text-team-primary" />
              <span className="text-xs">Game Day</span>
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-secondary">
              Recent Activity
            </h2>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <AppCard variant="muted" className="space-y-0 p-0 overflow-hidden">
            <div className="flex items-center gap-3 p-3 border-b border-border">
              <Avatar fallback="JD" size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Jake completed workout</p>
                <p className="text-xs text-text-muted">2 hours ago</p>
              </div>
              <Tag variant="success" size="sm">
                <CheckCircle className="w-3 h-3" />
                Done
              </Tag>
            </div>
            <div className="flex items-center gap-3 p-3">
              <Avatar fallback="MK" size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Mike started practice</p>
                <p className="text-xs text-text-muted">3 hours ago</p>
              </div>
              <Tag variant="accent" size="sm">
                In Progress
              </Tag>
            </div>
          </AppCard>
        </div>
      </PageContainer>
    </AppShell>
  );
};

// Reference Screen: Today's Practice
const TodaysPracticeScreen: React.FC = () => {
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
    if (completed) {
      toast.success("Nice work!", "Keep it up!");
    }
  };

  const completedCount = items.filter((i) => i.completed).length;

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Today</h1>
            <p className="text-xs text-text-muted">Friday Practice</p>
          </div>
          <div className="flex items-center gap-2">
            <Tag variant="tier">Rep</Tag>
            <Tag variant="gameday" icon={<Calendar className="w-3 h-3" />}>
              Game Day
            </Tag>
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
              <p className="text-sm text-text-muted">Pre-game routine</p>
            </div>
          </div>
          <ProgressBar
            value={completedCount}
            max={items.length}
            className="mt-4"
          />
        </AppCard>

        {/* Offline indicator */}
        <Tag variant="offline" className="mx-auto" icon={<WifiOff className="w-3 h-3" />}>
          Saved on device
        </Tag>

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

// Reference Screen: Player Switcher
const PlayerSwitcherScreen: React.FC = () => {
  const [selectedPlayer, setSelectedPlayer] = useState("1");

  const players = [
    {
      id: "1",
      name: "Jake Davidson",
      teams: [
        { name: "Toronto Hawks", tier: "Rep", active: true },
        { name: "Summer Select", tier: "Elite", active: false },
      ],
    },
    {
      id: "2",
      name: "Mike Thompson",
      teams: [{ name: "Toronto Hawks", tier: "Rep", active: true }],
    },
    {
      id: "3",
      name: "Sarah Chen",
      teams: [
        { name: "Girls U14", tier: "Rep", active: true },
        { name: "Spring Camp", tier: "Rec", active: false },
      ],
    },
  ];

  return (
    <AppShell
      header={
        <PageHeader
          title="Players"
          subtitle="Select a player to view their workouts"
        />
      }
    >
      <PageContainer className="pt-2">
        <div className="space-y-3">
          {players.map((player) => (
            <AppCard
              key={player.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedPlayer === player.id
                  ? "ring-2 ring-team-primary ring-offset-2"
                  : ""
              }`}
              onClick={() => setSelectedPlayer(player.id)}
            >
              <div className="flex items-center gap-3">
                <Avatar fallback={player.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{player.name}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {player.teams.map((team, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Tag
                          variant={team.active ? "accent" : "neutral"}
                          size="sm"
                        >
                          {team.name}
                        </Tag>
                        <Tag variant="tier" size="sm">
                          {team.tier}
                        </Tag>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedPlayer === player.id && (
                  <div className="w-6 h-6 rounded-full bg-team-primary flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </AppCard>
          ))}
        </div>

        {/* Empty State Demo */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            Empty State Example
          </h2>
          <AppCard>
            <EmptyState
              icon={UserPlus}
              title="No players yet"
              description="Add your first player to get started with training sessions."
              action={{
                label: "Add Player",
                onClick: () => toast.info("Add player flow", "Coming soon!"),
              }}
            />
          </AppCard>
        </div>

        {/* Skeleton Loading Demo */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            Loading States
          </h2>
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonListItem />
            <SkeletonListItem />
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
};

// Main Index - Tab Navigation between reference screens
const Index: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<"home" | "practice" | "players">("home");

  const screens = {
    home: <TeamHomeScreen />,
    practice: <TodaysPracticeScreen />,
    players: <PlayerSwitcherScreen />,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Screen selector tabs */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-1 p-2 max-w-lg mx-auto">
          {(["home", "practice", "players"] as const).map((screen) => (
            <button
              key={screen}
              onClick={() => setActiveScreen(screen)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                activeScreen === screen
                  ? "bg-team-primary text-primary-foreground"
                  : "text-text-muted hover:bg-muted"
              }`}
            >
              {screen === "home" && "Team Home"}
              {screen === "practice" && "Today"}
              {screen === "players" && "Players"}
            </button>
          ))}
        </div>
      </div>

      {/* Active screen */}
      <div className="max-w-lg mx-auto bg-background min-h-screen shadow-elevated">
        {screens[activeScreen]}
      </div>
    </div>
  );
};

export default Index;
