import * as React from "react";
import { cn } from "@/lib/utils";
import { Home, Users, User, Settings } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  hideNav?: boolean;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Users, label: "Teams", path: "/teams" },
  { icon: User, label: "Players", path: "/players" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export const AppShell: React.FC<AppShellProps> = ({ children, header, hideNav = false }) => {
  const location = useLocation();
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      {header && (
        <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-3">
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
      
      {/* Bottom Navigation */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg transition-colors tap-target",
                    "hover:bg-muted/50 active:scale-95",
                    isActive ? "text-team-primary" : "text-text-muted"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-all",
                    isActive && "scale-110"
                  )} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={cn(
                    "text-[10px] font-medium",
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
