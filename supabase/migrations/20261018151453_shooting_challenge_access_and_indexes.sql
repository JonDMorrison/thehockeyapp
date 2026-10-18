-- Explicit deny policies document the RPC-only ledger, including for future grants.
create policy shooting_players_deny_direct on public.shooting_challenge_players for all to anon,authenticated using(false) with check(false);
create policy shooting_days_deny_direct on public.shooting_challenge_days for all to anon,authenticated using(false) with check(false);
create policy shooting_audit_deny_direct on public.shooting_challenge_audit for all to anon,authenticated using(false) with check(false);
create index shooting_challenges_created_by_idx on public.shooting_challenges(created_by);
create index shooting_challenge_audit_player_idx on public.shooting_challenge_audit(challenge_id,player_id);
