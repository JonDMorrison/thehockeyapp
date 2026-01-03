import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { applyTeamTheme, getStoredTeamTheme } from "@/lib/themes";
import Index from "./pages/Index";
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
import Today from "./pages/Today";
import PlayerToday from "./pages/PlayerToday";
import PlayerHistory from "./pages/PlayerHistory";

const queryClient = new QueryClient();

const App = () => {
  // Apply stored team theme on mount
  useEffect(() => {
    applyTeamTheme(getStoredTeamTheme());
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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/new" element={<PlayerNew />} />
            <Route path="/players/:id" element={<PlayerProfile />} />
            <Route path="/players/:id/home" element={<PlayerHome />} />
            <Route path="/guardian/join/:token" element={<GuardianJoin />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/new" element={<TeamNew />} />
            <Route path="/teams/:id" element={<TeamHome />} />
            <Route path="/teams/:id/settings" element={<TeamSettings />} />
            <Route path="/teams/:id/roster" element={<TeamRoster />} />
            <Route path="/teams/:id/practice" element={<TeamPractice />} />
            <Route path="/teams/:id/practice/new" element={<PracticeCardEditor />} />
            <Route path="/teams/:id/practice/:cardId/edit" element={<PracticeCardEditor />} />
            <Route path="/team/adult/join/:token" element={<TeamAdultJoin />} />
            <Route path="/join/:token" element={<JoinTeam />} />
            <Route path="/join/:token/player" element={<JoinTeamPlayer />} />
            <Route path="/today" element={<Today />} />
            <Route path="/players/:id/today" element={<PlayerToday />} />
            <Route path="/players/:id/history" element={<PlayerHistory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
