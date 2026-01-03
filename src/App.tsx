import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { applyTeamTheme, getStoredTeamTheme } from "@/lib/themes";
import { initOfflineDB } from "@/lib/offlineStorage";

// Marketing pages
import Home from "./pages/marketing/Home";
import Features from "./pages/marketing/Features";
import Demo from "./pages/marketing/Demo";

// App pages
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Players from "./pages/Players";
import PlayerNew from "./pages/PlayerNew";
import PlayerProfile from "./pages/PlayerProfile";
import PlayerHome from "./pages/PlayerHome";
import GuardianJoin from "./pages/GuardianJoin";
import Teams from "./pages/Teams";
import TeamNew from "./pages/TeamNew";
import TeamHome from "./pages/TeamHome";
import TeamSettings from "./pages/TeamSettings";
import TeamRoster from "./pages/TeamRoster";
import TeamAdultJoin from "./pages/TeamAdultJoin";
import JoinTeam from "./pages/JoinTeam";
import JoinTeamPlayer from "./pages/JoinTeamPlayer";
import TeamPractice from "./pages/TeamPractice";
import PracticeCardEditor from "./pages/PracticeCardEditor";
import WorkoutBuilder from "./pages/WorkoutBuilder";
import WeekPlanEditor from "./pages/WeekPlanEditor";
import Templates from "./pages/Templates";
import Today from "./pages/Today";
import PlayerToday from "./pages/PlayerToday";
import PlayerHistory from "./pages/PlayerHistory";
import PlayerBadges from "./pages/PlayerBadges";
import RosterPlayerDetail from "./pages/RosterPlayerDetail";
import TeamProgress from "./pages/TeamProgress";
import QuickCheckoff from "./pages/QuickCheckoff";
import WidgetSettings from "./pages/WidgetSettings";
import CoachDashboard from "./pages/CoachDashboard";

const queryClient = new QueryClient();

const App = () => {
  // Apply stored team theme and initialize offline DB on mount
  useEffect(() => {
    applyTeamTheme(getStoredTeamTheme());
    initOfflineDB().catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner 
          position="top-center"
          toastOptions={{
            className: "bg-card text-foreground border border-border shadow-medium",
          }}
        />
        <BrowserRouter>
          <Routes>
            {/* Marketing pages */}
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/demo" element={<Demo />} />
            
            {/* Auth */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Player management */}
            <Route path="/players" element={<Players />} />
            <Route path="/players/new" element={<PlayerNew />} />
            <Route path="/players/:id" element={<PlayerProfile />} />
            <Route path="/players/:id/home" element={<PlayerHome />} />
            <Route path="/players/:id/today" element={<PlayerToday />} />
            <Route path="/players/:id/history" element={<PlayerHistory />} />
            <Route path="/players/:id/badges" element={<PlayerBadges />} />
            <Route path="/guardian/join/:token" element={<GuardianJoin />} />
            
            {/* Team management */}
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/new" element={<TeamNew />} />
            <Route path="/teams/:id" element={<TeamHome />} />
            <Route path="/teams/:id/coach" element={<CoachDashboard />} />
            <Route path="/teams/:id/settings" element={<TeamSettings />} />
            <Route path="/teams/:id/roster" element={<TeamRoster />} />
            <Route path="/teams/:teamId/roster/:playerId" element={<RosterPlayerDetail />} />
            <Route path="/teams/:id/practice" element={<TeamPractice />} />
            <Route path="/teams/:id/practice/new" element={<PracticeCardEditor />} />
            <Route path="/teams/:id/practice/:cardId/edit" element={<PracticeCardEditor />} />
            <Route path="/teams/:id/builder" element={<WorkoutBuilder />} />
            <Route path="/teams/:id/builder/new" element={<WeekPlanEditor />} />
            <Route path="/teams/:id/builder/:planId" element={<WeekPlanEditor />} />
            <Route path="/teams/:id/progress" element={<TeamProgress />} />
            
            {/* Join flows */}
            <Route path="/team/adult/join/:token" element={<TeamAdultJoin />} />
            <Route path="/join/:token" element={<JoinTeam />} />
            <Route path="/join/:token/player" element={<JoinTeamPlayer />} />
            
            {/* Other */}
            <Route path="/today" element={<Today />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/quick-checkoff" element={<QuickCheckoff />} />
            <Route path="/settings/widgets" element={<WidgetSettings />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
