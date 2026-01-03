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
import GuardianJoin from "./pages/GuardianJoin";
import Teams from "./pages/Teams";
import TeamNew from "./pages/TeamNew";
import TeamHome from "./pages/TeamHome";
import TeamSettings from "./pages/TeamSettings";
import TeamAdultJoin from "./pages/TeamAdultJoin";

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
            <Route path="/guardian/join/:token" element={<GuardianJoin />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/new" element={<TeamNew />} />
            <Route path="/teams/:id" element={<TeamHome />} />
            <Route path="/teams/:id/settings" element={<TeamSettings />} />
            <Route path="/team/adult/join/:token" element={<TeamAdultJoin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
