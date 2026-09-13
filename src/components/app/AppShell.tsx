import * as React from "react";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  History,
  Home,
  Settings,
  User,
  Users,
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { UserMenu } from "./UserMenu";
import { NavigationHeader } from "./NavigationHeader";
import { OfflineDot } from "./OfflineIndicator";
import { ContextSwitcher } from "./ContextSwitcher";
import { useOffline } from "@/hooks/useOffline";
import { useTranslation } from "react-i18next";
import { HockeyAppLogo } from "@/components/marketing/HockeyAppLogo";

interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  hideNav?: boolean;
  hideUserMenu?: boolean;
  /** Use smart navigation header with back button */
  useNavHeader?: boolean;
  /** Title for nav header */
  navTitle?: string;
  /** Subtitle for nav header */
  navSubtitle?: string;
  /** Show large title style */
  largeTitleHeader?: boolean;
  /** Right action for nav header */
  navAction?: React.ReactNode;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface WorkspaceNavigation {
  eyebrow: string;
  items: NavItem[];
}

function getWorkspaceNavigation(pathname: string, t: (key: string) => string): WorkspaceNavigation {
  const teamMatch = pathname.match(/^\/teams\/([^/]+)/);
  if (teamMatch && teamMatch[1] !== "new") {
    const teamRoot = `/teams/${teamMatch[1]}`;
    return {
      eyebrow: "Team workspace",
      items: [
        { icon: Home, label: "Home", path: teamRoot },
        { icon: ClipboardCheck, label: "Plan", path: `${teamRoot}/builder` },
        { icon: Users, label: "Roster", path: `${teamRoot}/roster` },
        { icon: BarChart3, label: "Progress", path: `${teamRoot}/progress` },
      ],
    };
  }

  const playerMatch = pathname.match(/^\/players\/([^/]+)/);
  if (playerMatch && playerMatch[1] !== "new") {
    const playerRoot = `/players/${playerMatch[1]}`;
    return {
      eyebrow: "Player workspace",
      items: [
        { icon: Home, label: "Home", path: `${playerRoot}/home` },
        { icon: ClipboardCheck, label: "Today", path: `${playerRoot}/today` },
        { icon: CalendarDays, label: "Week", path: `${playerRoot}/week` },
        { icon: History, label: "History", path: `${playerRoot}/history` },
      ],
    };
  }

  const associationMatch = pathname.match(/^\/associations\/([^/]+)/);
  if (associationMatch && associationMatch[1] !== "new") {
    const associationRoot = `/associations/${associationMatch[1]}`;
    return {
      eyebrow: "Association HQ",
      items: [
        { icon: Building2, label: "Overview", path: associationRoot },
        { icon: Users, label: "Teams", path: `${associationRoot}#association-teams` },
        { icon: User, label: "Access", path: `${associationRoot}#association-access` },
        { icon: Settings, label: "Settings", path: "/settings" },
      ],
    };
  }

  return {
    eyebrow: "My hockey",
    items: [
      { icon: Home, label: t("nav.home"), path: "/today" },
      { icon: Users, label: t("nav.teams"), path: "/teams" },
      { icon: User, label: t("nav.players"), path: "/players" },
      { icon: Settings, label: t("nav.settings"), path: "/settings" },
    ],
  };
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  header,
  hideNav = false,
  hideUserMenu = false,
  useNavHeader = false,
  navTitle,
  navSubtitle,
  largeTitleHeader = false,
  navAction,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { status: offlineStatus } = useOffline();
  const workspaceNavigation = getWorkspaceNavigation(location.pathname, t);
  const navItems = workspaceNavigation.items;
  const currentLocation = `${location.pathname}${location.hash}`;
  const activeNavPath = navItems
    .filter((item) => {
      if (item.path.includes("#")) return currentLocation === item.path;
      if (location.hash) return false;
      return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    })
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;

  // Determine if this is a root tab
  const isRootTab = navItems.some(item => item.path === `${location.pathname}${location.hash}` || item.path === location.pathname);

  const isItemActive = (item: NavItem) => item.path === activeNavPath;

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {!hideNav && (
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-white/[0.07] bg-[#090b0f] lg:flex">
          <Link to="/today" className="flex h-20 items-center gap-3 border-b border-white/[0.07] px-5">
            <HockeyAppLogo size={34} />
            <div>
              <p className="font-display text-base font-black uppercase tracking-tight text-white">The Hockey App</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">{workspaceNavigation.eyebrow}</p>
            </div>
          </Link>
          <nav className="flex-1 space-y-1 p-3" aria-label={`${workspaceNavigation.eyebrow} navigation`}>
            {navItems.map((item) => {
              const isActive = isItemActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors",
                    isActive ? "bg-primary text-white" : "text-white/52 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 1.75} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/[0.07] p-4 text-[10px] leading-4 text-white/30">
            Plan the week. Build the habit. See the progress.
          </div>
        </aside>
      )}

      {/* Floating User Menu - Top Right */}
      {!hideUserMenu && (
        <div className="fixed right-3 top-3 z-[60] flex items-center gap-1 rounded-full border border-white/[0.07] bg-background/85 p-1 shadow-lg backdrop-blur-xl lg:right-5">
          <OfflineDot status={offlineStatus} />
          <ContextSwitcher compact />
          <UserMenu size="sm" />
        </div>
      )}

      {/* Smart Navigation Header */}
      {useNavHeader && (
        <header className={cn("sticky top-0 z-40 safe-top border-b border-border/80 border-t-2 border-t-primary bg-background/92 backdrop-blur-xl", !hideNav && "lg:pl-60")}>
          <div className="mx-auto max-w-7xl px-4 py-2 pr-28 sm:px-6 lg:px-8">
            <NavigationHeader
              title={navTitle}
              subtitle={navSubtitle}
              largeTitle={largeTitleHeader}
              rightAction={navAction}
              isRoot={isRootTab}
            />
          </div>
        </header>
      )}

      {/* Legacy Header (for backward compatibility) */}
      {!useNavHeader && header && (
        <header className={cn("sticky top-0 z-40 safe-top border-b border-border/80 border-t-2 border-t-primary bg-background/92 backdrop-blur-xl", !hideNav && "lg:pl-60")}>
          <div className="mx-auto max-w-7xl px-4 py-3 pr-28 sm:px-6 lg:px-8">
            {header}
          </div>
        </header>
      )}

      {/* Main content area */}
      <main className={cn(
        "flex-1 overflow-y-auto",
        !hideNav && "pb-20 lg:pb-0 lg:pl-60" // Mobile dock, desktop rail
      )}>
        {children}
      </main>

      {/* Bottom Navigation with animated indicator */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-[#0a0b0f]/95 backdrop-blur-xl safe-bottom lg:hidden">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative">
            {navItems.map((item) => {
              const isActive = isItemActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 py-2 px-5 transition-all duration-200 tap-target",
                    "active:scale-95",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Animated background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute top-0 left-3 right-3 h-0.5 bg-primary"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35
                      }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "w-5 h-5 relative z-10 transition-transform duration-200",
                      isActive && "scale-110"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                  <span className={cn(
                    "text-[10px] font-medium relative z-10 transition-all duration-200",
                    isActive && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

// Page container with consistent padding
interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={cn("mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8", className)} {...props}>
      {children}
    </div>
  );
};

// Page header component
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
