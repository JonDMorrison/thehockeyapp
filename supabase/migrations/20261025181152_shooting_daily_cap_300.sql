-- Raise the standard daily leaderboard allowance without changing logged effort.
alter table public.shooting_challenges alter column daily_cap set default 300;

-- Upgrade challenges still using the previous standard; retain other custom caps.
update public.shooting_challenges set daily_cap = 300 where daily_cap = 250;
