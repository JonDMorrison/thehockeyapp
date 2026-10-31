import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShootingStandings } from '../../src/components/shooting/ShootingStandings';
import '../../src/i18n';
import '../../src/index.css';
const snapshot: any = {
 challenge: { id: 'challenge', team_id: 'team', name: 'October challenge', timezone: 'America/Vancouver', daily_cap: 300 },
 team_name: 'Hawks', status: 'Live', days: [],
 players: [
 { player_id: 'friend', first_name: 'Eli', last_initial: 'R', total: 500, rank: 1, active_member: true, is_mine: false },
 { player_id: 'mine', first_name: 'Grace', total: 250, rank: 2, active_member: true, is_mine: true }
 ]
};
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><main className="dark bg-background text-foreground min-h-screen p-4"><ShootingStandings snapshot={snapshot} viewerId="parent" /></main></QueryClientProvider>);
