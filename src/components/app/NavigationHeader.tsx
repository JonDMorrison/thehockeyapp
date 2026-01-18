import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavigationHeaderProps {
  /** Page title */
  title?: string;
  /** Subtitle or context info */
  subtitle?: string;
  /** Whether to show back button */
  showBack?: boolean;
  /** Custom back navigation path */
  backPath?: string;
  /** Right side actions */
  rightAction?: React.ReactNode;
  /** Whether this is a root level page (no back) */
  isRoot?: boolean;
  /** Large title style (iOS-like) */
  largeTitle?: boolean;
  /** Additional className */
  className?: string;
}

// Route hierarchy for smart back navigation
const routeHierarchy: Record<string, string> = {
  // Team routes
  "/teams/:id/settings": "/teams/:id",
  "/teams/:id/roster": "/teams/:id",
  "/teams/:id/progress": "/teams/:id",
  "/teams/:id/practice": "/teams/:id",
  "/teams/:id/practice/new": "/teams/:id/practice",
  "/teams/:id/builder": "/teams/:id",
  "/teams/:id/assign": "/teams/:id",
  "/teams/:id": "/teams",
  "/teams/new": "/teams",
  
  // Player routes
  "/players/:id/today": "/players/:id/home",
  "/players/:id/history": "/players/:id/home",
  "/players/:id/badges": "/players/:id/home",
  "/players/:id/goals": "/players/:id/home",
  "/players/:id/home": "/players",
  "/players/:id": "/players",
  "/players/new": "/players",
  
  // Solo routes
  "/solo/today/:playerId": "/solo/dashboard/:playerId",
  "/solo/badges/:playerId": "/solo/dashboard/:playerId",
  "/solo/planning/:playerId": "/solo/dashboard/:playerId",
  "/solo/workout/:playerId": "/solo/planning/:playerId",
  "/solo/week-planner/:playerId": "/solo/planning/:playerId",
  "/solo/program/:playerId": "/solo/planning/:playerId",
  "/solo/settings/:playerId": "/solo/dashboard/:playerId",
  "/solo/dashboard/:playerId": "/players",
};

// Root pages that don't have back buttons
const rootPages = ["/today", "/teams", "/players", "/settings", "/", "/welcome", "/auth"];

function matchRoute(pathname: string, pattern: string): Record<string, string> | null {
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");
  
  if (patternParts.length !== pathParts.length) return null;
  
  const params: Record<string, string> = {};
  
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  
  return params;
}

function getBackPath(pathname: string): string | null {
  // Check if root page
  if (rootPages.includes(pathname)) return null;
  
  // Try to match against hierarchy
  for (const [pattern, parentPattern] of Object.entries(routeHierarchy)) {
    const params = matchRoute(pathname, pattern);
    if (params) {
      // Replace params in parent pattern
      let backPath = parentPattern;
      for (const [key, value] of Object.entries(params)) {
        backPath = backPath.replace(`:${key}`, value);
      }
      return backPath;
    }
  }
  
  // Fallback: go up one level
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 1) {
    return "/" + parts.slice(0, -1).join("/");
  }
  
  return null;
}

// Get breadcrumb from pathname
function getBreadcrumb(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  
  // Transform route segments into readable labels
  const labels: string[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // Skip IDs (UUIDs or numeric)
    if (part.match(/^[0-9a-f-]{36}$/i) || part.match(/^\d+$/)) {
      continue;
    }
    
    // Capitalize and clean up
    const label = part
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    
    labels.push(label);
  }
  
  return labels;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  backPath,
  rightAction,
  isRoot = false,
  largeTitle = false,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const computedBackPath = backPath || getBackPath(location.pathname);
  const shouldShowBack = showBack && !isRoot && computedBackPath;
  const breadcrumb = getBreadcrumb(location.pathname);
  
  const handleBack = () => {
    if (computedBackPath) {
      navigate(computedBackPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      {/* Compact Header Row */}
      <div className="flex items-center gap-2 min-h-[44px]">
        {/* Back Button */}
        <AnimatePresence mode="wait">
          {shouldShowBack && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0 -ml-2 w-10 h-10 rounded-full hover:bg-muted/80"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Title Area */}
        <div className="flex-1 min-w-0">
          {!largeTitle && title && (
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold tracking-tight truncate"
            >
              {title}
            </motion.h1>
          )}
          
          {/* Breadcrumb (shown when there's a subtitle or no title) */}
          {breadcrumb.length > 1 && !title && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              {breadcrumb.slice(0, -1).map((crumb, i) => (
                <React.Fragment key={i}>
                  <span className="truncate max-w-[80px]">{crumb}</span>
                  <ChevronLeft className="w-3 h-3 rotate-180 opacity-50" />
                </React.Fragment>
              ))}
              <span className="font-medium text-foreground truncate">
                {breadcrumb[breadcrumb.length - 1]}
              </span>
            </motion.div>
          )}
        </div>
        
        {/* Right Action */}
        {rightAction && (
          <div className="shrink-0">
            {rightAction}
          </div>
        )}
      </div>
      
      {/* Large Title (iOS-style) */}
      {largeTitle && title && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </motion.div>
      )}
      
      {/* Subtitle (for compact mode) */}
      {!largeTitle && subtitle && (
        <p className="text-sm text-muted-foreground -mt-0.5">{subtitle}</p>
      )}
    </div>
  );
};