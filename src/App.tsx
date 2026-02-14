import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { applyTeamTheme, getStoredTeamTheme } from "@/lib/themes";
import { logger, ErrorBoundary } from "@/core";
import { initOfflineDB } from "@/lib/offlineStorage";
import { ActiveViewProvider } from "@/contexts/ActiveViewContext";
import { SwipeBackGesture } from "@/components/app/SwipeBackGesture";

// Marketing pages - loaded eagerly for fast landing page
import Home from "./pages/marketing/Home";

// Lazy load all other pages for faster initial load
const Features = lazy(() => import("./pages/marketing/Features"));
const Pricing = lazy(() => import("./pages/marketing/Pricing"));
const Demo = lazy(() => import("./pages/marketing/Demo"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));

// App pages - lazy loaded
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const Players = lazy(() => import("./pages/Players"));
const PlayerNew = lazy(() => import("./pages/PlayerNew"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const PlayerHome = lazy(() => import("./pages/PlayerHome"));
const GuardianJoin = lazy(() => import("./pages/GuardianJoin"));
const Teams = lazy(() => import("./pages/Teams"));
const TeamNew = lazy(() => import("./pages/TeamNew"));
const TeamSettings = lazy(() => import("./pages/TeamSettings"));
const TeamRoster = lazy(() => import("./pages/TeamRoster"));
const TeamAdultJoin = lazy(() => import("./pages/TeamAdultJoin"));
const JoinTeam = lazy(() => import("./pages/JoinTeam"));
const JoinTeamPlayer = lazy(() => import("./pages/JoinTeamPlayer"));
const JoinTeamSearch = lazy(() => import("./pages/JoinTeamSearch"));
const TeamPractice = lazy(() => import("./pages/TeamPractice"));
const PracticeCardEditor = lazy(() => import("./pages/PracticeCardEditor"));
const WorkoutBuilder = lazy(() => import("./pages/WorkoutBuilder"));
const WeekPlanEditor = lazy(() => import("./pages/WeekPlanEditor"));
const WeekPlannerNew = lazy(() => import("./pages/WeekPlannerNew"));
const Templates = lazy(() => import("./pages/Templates"));
const Today = lazy(() => import("./pages/Today"));
const PlayerToday = lazy(() => import("./pages/PlayerToday"));
const PlayerHistory = lazy(() => import("./pages/PlayerHistory"));
const PlayerBadges = lazy(() => import("./pages/PlayerBadges"));
const PlayerTeamGoals = lazy(() => import("./pages/PlayerTeamGoals"));
const RosterPlayerDetail = lazy(() => import("./pages/RosterPlayerDetail"));
const TeamProgress = lazy(() => import("./pages/TeamProgress"));
const QuickCheckoff = lazy(() => import("./pages/QuickCheckoff"));
const WidgetSettings = lazy(() => import("./pages/WidgetSettings"));
const CoachDashboard = lazy(() => import("./pages/CoachDashboard"));
const Welcome = lazy(() => import("./pages/Welcome"));
const QuickAssign = lazy(() => import("./pages/QuickAssign"));
const SoloSetup = lazy(() => import("./pages/SoloSetup"));
const SoloToday = lazy(() => import("./pages/SoloToday"));
const SoloDashboard = lazy(() => import("./pages/SoloDashboard"));
const SoloBadges = lazy(() => import("./pages/SoloBadges"));
const SoloPlanningHub = lazy(() => import("./pages/SoloPlanningHub"));
const SoloWorkoutBuilder = lazy(() => import("./pages/SoloWorkoutBuilder"));
const SoloWeekPlanner = lazy(() => import("./pages/SoloWeekPlanner"));
const SoloProgramBuilder = lazy(() => import("./pages/SoloProgramBuilder"));
const SoloTryWorkout = lazy(() => import("./pages/SoloTryWorkout"));
const SoloSettings = lazy(() => import("./pages/SoloSettings"));
const Settings = lazy(() => import("./pages/Settings"));
const CompAdmin = lazy(() => import("./pages/admin/CompAdmin"));

const queryClient = new QueryClient();

// Simple loading fallback with animation
const PageLoader = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="min-h-screen flex items-center justify-center bg-background"
  >
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" 
    />
  </motion.div>
);

// Animated routes wrapper
const AnimatedRoutes = () => {
  const location = useLocation();
  
  // Determine if this is a marketing page (no swipe back)
  const isMarketingPage = ["/", "/features", "/pricing", "/demo", "/about", "/privacy", "/terms"].includes(location.pathname);
  
  return (
    <SwipeBackGesture enabled={!isMarketingPage}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ 
            type: "spring", 
            stiffness: 380, 
            damping: 35,
            opacity: { duration: 0.15 }
          }}
          className="flex-1 flex flex-col min-h-screen"
        >
          <Routes location={location}>
            {/* Marketing pages */}
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            
            {/* Auth */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/welcome" element={<Welcome />} />
            
            {/* Player management */}
            <Route path="/players" element={<Players />} />
            <Route path="/players/new" element={<PlayerNew />} />
            <Route path="/players/:id" element={<PlayerProfile />} />
            <Route path="/players/:id/home" element={<PlayerHome />} />
            <Route path="/players/:id/today" element={<PlayerToday />} />
            <Route path="/players/:id/history" element={<PlayerHistory />} />
            <Route path="/players/:id/badges" element={<PlayerBadges />} />
            <Route path="/players/:id/goals" element={<PlayerTeamGoals />} />
            <Route path="/guardian/join/:token" element={<GuardianJoin />} />
            
            {/* Team management */}
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/new" element={<TeamNew />} />
            <Route path="/teams/:id" element={<CoachDashboard />} />
            <Route path="/teams/:id/assign" element={<QuickAssign />} />
            <Route path="/teams/:id/coach" element={<CoachDashboard />} />
            <Route path="/teams/:id/settings" element={<TeamSettings />} />
            <Route path="/teams/:id/roster" element={<TeamRoster />} />
            <Route path="/teams/:teamId/roster/:playerId" element={<RosterPlayerDetail />} />
            <Route path="/teams/:id/practice" element={<TeamPractice />} />
            <Route path="/teams/:id/practice/new" element={<PracticeCardEditor />} />
            <Route path="/teams/:id/practice/:cardId" element={<PracticeCardEditor />} />
            <Route path="/teams/:id/practice/:cardId/edit" element={<PracticeCardEditor />} />
            <Route path="/teams/:id/builder" element={<WorkoutBuilder />} />
            <Route path="/teams/:id/builder/new" element={<WeekPlannerNew />} />
            <Route path="/teams/:id/builder/:planId" element={<WeekPlanEditor />} />
            <Route path="/teams/:id/progress" element={<TeamProgress />} />
            
            {/* Join flows */}
            <Route path="/team/adult/join/:token" element={<TeamAdultJoin />} />
            <Route path="/join" element={<JoinTeamSearch />} />
            <Route path="/join/:token" element={<JoinTeam />} />
            <Route path="/join/:token/player" element={<JoinTeamPlayer />} />
            
            {/* Solo training */}
            <Route path="/solo/setup" element={<SoloSetup />} />
            <Route path="/solo/dashboard/:playerId" element={<SoloDashboard />} />
            <Route path="/solo/today/:playerId" element={<SoloToday />} />
            <Route path="/solo/badges/:playerId" element={<SoloBadges />} />
            <Route path="/solo/planning/:playerId" element={<SoloPlanningHub />} />
            <Route path="/solo/workout/:playerId" element={<SoloWorkoutBuilder />} />
            <Route path="/solo/week-planner/:playerId" element={<SoloWeekPlanner />} />
            <Route path="/solo/program/:playerId" element={<SoloProgramBuilder />} />
            <Route path="/solo/try/:token" element={<SoloTryWorkout />} />
            <Route path="/solo/settings/:playerId" element={<SoloSettings />} />
            
            {/* Other */}
            <Route path="/today" element={<Today />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/quick-checkoff" element={<QuickCheckoff />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/widgets" element={<WidgetSettings />} />
            <Route path="/admin/comp" element={<CompAdmin />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </SwipeBackGesture>
  );
};

const App = () => {
  // Apply stored team theme and initialize offline DB on mount
  useEffect(() => {
    applyTeamTheme(getStoredTeamTheme());
    initOfflineDB().catch((err) => logger.error("Failed to init offline DB", { err }));
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ActiveViewProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner 
              position="top-center"
              toastOptions={{
                className: "bg-card text-foreground border border-border shadow-medium",
              }}
            />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<PageLoader />}>
                <AnimatedRoutes />
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </ActiveViewProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
