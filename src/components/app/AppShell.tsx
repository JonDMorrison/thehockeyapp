import * as React from "react";
import { cn } from "@/lib/utils";
import { Home, Users, User, Settings } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { UserMenu } from "./UserMenu";
import { NavigationHeader } from "./NavigationHeader";

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

const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/today" },
  { icon: Users, label: "Teams", path: "/teams" },
  { icon: User, label: "Players", path: "/players" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

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
  const location = useLocation();
  
  // Determine if this is a root tab
  const isRootTab = navItems.some(item => item.path === location.pathname);
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      
      {/* Floating User Menu - Top Right */}
      {!hideUserMenu && (
        <div className="fixed top-3 right-3 z-50">
          <UserMenu size="sm" />
        </div>
      )}
      
      {/* Smart Navigation Header */}
      {useNavHeader && (
        <header className="sticky top-0 z-40 safe-top bg-background/95 backdrop-blur-xl border-b border-border/50">
          <div className="px-4 py-2 pr-14">
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
        <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3 pr-14">
            {header}
          </div>
        </header>
      )}
      
      {/* Main content area */}
      <main className={cn(
        "flex-1 overflow-y-auto",
        !hideNav && "pb-20" // Space for bottom nav
      )}>
        {children}
      </main>
      
      {/* Bottom Navigation with animated indicator */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 safe-bottom">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path === "/teams" && location.pathname.startsWith("/teams")) ||
                (item.path === "/players" && location.pathname.startsWith("/players"));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 py-2 px-5 rounded-2xl transition-all duration-200 tap-target",
                    "active:scale-95",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Animated background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 bg-primary/10 rounded-2xl"
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
    <div className={cn("px-4 py-6 space-y-6", className)} {...props}>
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
