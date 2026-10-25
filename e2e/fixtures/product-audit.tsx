import { SessionPhotoUpload } from "../../src/components/player/SessionPhotoUpload";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { PlayerProfilePrompt } from "../../src/components/player/PlayerProfilePrompt";
import { PlayerPhotoEditor } from "../../src/components/player/PlayerPhotoEditor";
import { ContextSwitcher } from "../../src/components/app/ContextSwitcher";
import { ShootingEntry } from "../../src/components/shooting/ShootingEntry";
import { ShootingCapSettings } from "../../src/components/shooting/ShootingCapSettings";
import { ShootingReviewQueue } from "../../src/components/shooting/ShootingReviewQueue";
import { ActiveViewProvider } from "../../src/contexts/ActiveViewContext";
import { supabase } from "../../src/integrations/supabase/client";
import { setOfflineAccountOwner } from "../../src/lib/offlineStorage";
import { syncPendingEvents } from "../../src/lib/syncEngine";
import "../../src/i18n";
import "../../src/index.css";
const user = "10000000-0000-4000-8000-000000000001",
  playerId = "20000000-0000-4000-8000-000000000001";
setOfflineAccountOwner(user);
const snapshot: any = {
  challenge: {
    id: "30000000-0000-4000-8000-000000000001",
    team_id: "40000000-0000-4000-8000-000000000001",
    name: "Practice",
    daily_cap: 300,
    review_threshold: 1000,
  },
  today: "2026-10-25",
  status: "Live",
  players: [
    {
      player_id: playerId,
      first_name: "Alex",
      eligible_from: "2026-10-01",
      active_member: true,
      is_mine: true,
      total: 0,
    },
  ],
  days: [],
  cap_locked: true,
  review_entries: [
    {
      player_id: playerId,
      shot_date: "2026-10-25",
      shots: 3000,
      version: 1,
      reviewed: false,
    },
  ],
};
export function Fixture() {
  const scenario = new URLSearchParams(location.search).get("case");
  const [sibling, setSibling] = useState(false);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["player", playerId],
    enabled: scenario === "photo",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single();
      if (error) throw error;
      return data;
    },
  });
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      {scenario === "prompt" && (
        <>
          <PlayerProfilePrompt
            player={{
              id: sibling ? "sibling" : playerId,
              first_name: sibling ? "Blair" : "Alex",
            }}
          />
          <button onClick={() => setSibling((s) => !s)}>Switch sibling</button>
        </>
      )}
      {scenario === "photo" && query.data && (
        <>
          <button onClick={() => setOpen(true)}>Edit player photo</button>
          <PlayerPhotoEditor
            player={query.data}
            open={open}
            onOpenChange={setOpen}
          />
        </>
      )}
      {scenario === "photos" && (
        <SessionPhotoUpload
          playerId={playerId}
          playerName="Alex"
          practiceCardId="50000000-0000-4000-8000-000000000001"
        />
      )}
      {scenario === "switcher" && <ContextSwitcher compact />}
      {scenario === "entry" && (
        <>
          <ShootingEntry
            snapshot={snapshot}
            player={snapshot.players[0]}
            date={snapshot.today}
            viewerId={user}
          />
          <button onClick={() => void syncPendingEvents()}>
            Reconnect and sync
          </button>
        </>
      )}
      {scenario === "rules" && (
        <>
          <ShootingCapSettings
            id={snapshot.challenge.id}
            cap={300}
            locked
            threshold={1000}
          />
          <ShootingReviewQueue snapshot={snapshot} />
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <MemoryRouter>
      <ActiveViewProvider>
        <Fixture />
      </ActiveViewProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);
