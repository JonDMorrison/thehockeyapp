-- Independent challenge ledger: never imports workout counts or changes legacy goals.
create schema if not exists hockey_private;
revoke all on schema hockey_private from public;
grant usage on schema hockey_private to authenticated;

create table public.shooting_challenges (
  id uuid primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  timezone text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index shooting_challenges_team_idx on public.shooting_challenges(team_id, created_at desc);
create table public.shooting_challenge_players (
  challenge_id uuid not null references public.shooting_challenges(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  first_name text not null,
  last_initial text,
  enrolled_at timestamptz not null default now(),
  primary key(challenge_id, player_id)
);
create index shooting_challenge_players_player_idx on public.shooting_challenge_players(player_id);
create table public.shooting_challenge_days (
  challenge_id uuid not null,
  player_id uuid not null,
  shot_date date not null,
  shots integer not null check (shots between 0 and 10000),
  version integer not null check (version > 0),
  updated_at timestamptz not null default now(),
  primary key(challenge_id, player_id, shot_date),
  foreign key(challenge_id, player_id) references public.shooting_challenge_players(challenge_id, player_id) on delete cascade
);
create table public.shooting_challenge_audit (
  request_id uuid primary key,
  challenge_id uuid not null,
  player_id uuid not null,
  shot_date date not null,
  actor_id uuid not null references auth.users(id),
  previous_shots integer not null,
  shots integer not null,
  version integer not null,
  reason text,
  created_at timestamptz not null default now(),
  foreign key(challenge_id, player_id) references public.shooting_challenge_players(challenge_id, player_id) on delete cascade
);
create index shooting_challenge_audit_challenge_idx on public.shooting_challenge_audit(challenge_id, created_at desc);
create index shooting_challenge_audit_actor_idx on public.shooting_challenge_audit(actor_id);

-- Privileged implementation stays outside exposed schemas. Every entry point checks auth.
create function hockey_private.can_read_shooting(p_team uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and (
 public.is_team_adult(p_team, auth.uid()) or exists (
   select 1 from public.team_memberships m join public.players p on p.id=m.player_id
   where m.team_id=p_team and m.status='active' and (p.owner_user_id=auth.uid() or exists (
     select 1 from public.player_guardians g where g.player_id=p.id and g.user_id=auth.uid()
   ))
 ));
$$;

alter table public.shooting_challenges enable row level security;
alter table public.shooting_challenge_players enable row level security;
alter table public.shooting_challenge_days enable row level security;
alter table public.shooting_challenge_audit enable row level security;
revoke all on public.shooting_challenges, public.shooting_challenge_players, public.shooting_challenge_days, public.shooting_challenge_audit from anon, authenticated;
grant select on public.shooting_challenges to authenticated;
create policy shooting_team_read on public.shooting_challenges for select to authenticated
 using (hockey_private.can_read_shooting(team_id));
-- Player/day/audit tables deliberately have no direct API grants or policies.
-- Minimal standings and own daily totals are returned through the authorized snapshot.

create function hockey_private.enroll_shooting_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.status='active' then
   insert into public.shooting_challenge_players(challenge_id,player_id,first_name,last_initial)
   select c.id,p.id,p.first_name,p.last_initial from public.shooting_challenges c
   join public.players p on p.id=new.player_id
   where c.team_id=new.team_id and clock_timestamp() < ((c.end_date+1)::timestamp at time zone c.timezone)
   on conflict do nothing;
 end if;
 return new;
end;
$$;
create trigger enroll_shooting_member after insert or update of status on public.team_memberships
for each row execute function hockey_private.enroll_shooting_member();

create function hockey_private.create_shooting(p_id uuid,p_team uuid,p_name text,p_start date,p_end date,p_timezone text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.shooting_challenges; existing public.shooting_challenges;
begin
 if auth.uid() is null or not public.is_team_adult(p_team,auth.uid()) then
   raise exception 'Only team staff can publish a challenge' using errcode='42501';
 end if;
 if p_id is null or p_name is null or length(btrim(p_name)) not between 1 and 100 or p_start is null or p_end is null or p_end<p_start then
   raise exception 'Choose a name and valid start and end dates' using errcode='22023';
 end if;
 if p_timezone is null or not exists(select 1 from pg_timezone_names where name=p_timezone) then
   raise exception 'Choose a valid time zone' using errcode='22023';
 end if;
 -- Serialize retries, even when the original publication response was lost.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into existing from public.shooting_challenges where id=p_id;
 if found then
   if existing.created_by<>auth.uid() or existing.team_id<>p_team or existing.name<>btrim(p_name) or existing.start_date<>p_start or existing.end_date<>p_end or existing.timezone<>p_timezone then
     raise exception 'Publication request changed; review and publish again' using errcode='22023';
   end if;
   return existing.id;
 end if;
 if p_start < (clock_timestamp() at time zone p_timezone)::date then
   raise exception 'The challenge must start today or later' using errcode='22023';
 end if;
 -- Membership activation and publication share a team lock, avoiding missed late joins.
 perform 1 from public.teams where id=p_team for update;
 insert into public.shooting_challenges(id,team_id,name,start_date,end_date,timezone,created_by)
 values(p_id,p_team,btrim(p_name),p_start,p_end,p_timezone,auth.uid()) returning * into c;
 insert into public.shooting_challenge_players(challenge_id,player_id,first_name,last_initial)
 select c.id,p.id,p.first_name,p.last_initial from public.team_memberships m join public.players p on p.id=m.player_id
 where m.team_id=p_team and m.status='active' on conflict do nothing;
 return c.id;
end;
$$;

create function hockey_private.shooting_snapshot(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.shooting_challenges; t timestamptz := clock_timestamp(); today date; staff boolean;
begin
 select * into c from public.shooting_challenges where id=p_id;
 if not found or not hockey_private.can_read_shooting(c.team_id) then
   raise exception 'Challenge unavailable. Ask your coach for a team invitation.' using errcode='42501';
 end if;
 today := (t at time zone c.timezone)::date;
 staff := public.is_team_adult(c.team_id,auth.uid());
 return jsonb_build_object(
 'challenge',to_jsonb(c), 'team_name',(select name from public.teams where id=c.team_id),
 'server_now',t,'today',today,'is_staff',staff,
 'starts_at',c.start_date::timestamp at time zone c.timezone,
 'ends_at',(c.end_date+1)::timestamp at time zone c.timezone,
 'status',case when today<c.start_date then 'Scheduled' when today>c.end_date then 'Finished' else 'Live' end,
 'players',coalesce((select jsonb_agg(row_to_json(r) order by r.total desc,r.first_name,r.player_id) from (
   select e.player_id,e.first_name,e.last_initial,
   greatest(c.start_date,(e.enrolled_at at time zone c.timezone)::date) as eligible_from,
   coalesce(sum(d.shots),0) as total,
   case when coalesce(sum(d.shots),0)>0 then rank() over(order by coalesce(sum(d.shots),0) desc) else null end as rank,
   exists(select 1 from public.players p where p.id=e.player_id and (p.owner_user_id=auth.uid() or exists(
     select 1 from public.player_guardians g where g.player_id=p.id and g.user_id=auth.uid()))) as is_mine,
   exists(select 1 from public.team_memberships m where m.team_id=c.team_id and m.player_id=e.player_id and m.status='active') as active_member
   from public.shooting_challenge_players e left join public.shooting_challenge_days d on d.challenge_id=e.challenge_id and d.player_id=e.player_id
   where e.challenge_id=c.id group by e.player_id,e.first_name,e.last_initial,e.enrolled_at
 )r),'[]'::jsonb),
 'days',coalesce((select jsonb_agg(to_jsonb(d)) from public.shooting_challenge_days d
 where d.challenge_id=c.id and (staff or exists(select 1 from public.players p where p.id=d.player_id and
 (p.owner_user_id=auth.uid() or exists(select 1 from public.player_guardians g where g.player_id=p.id and g.user_id=auth.uid()))))),'[]'::jsonb),
 'audit',case when staff then coalesce((select jsonb_agg(to_jsonb(a)) from (
   select player_id,shot_date,previous_shots,shots,reason,created_at from public.shooting_challenge_audit
   where challenge_id=c.id order by created_at desc limit 100
 )a),'[]'::jsonb) else '[]'::jsonb end,
 'corrected',exists(select 1 from public.shooting_challenge_audit where challenge_id=c.id and reason is not null)
 );
end;
$$;

create function hockey_private.save_shooting(p_id uuid,p_player uuid,p_date date,p_shots integer,p_version integer,p_request uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.shooting_challenges; e public.shooting_challenge_players; d public.shooting_challenge_days;
 a public.shooting_challenge_audit; staff boolean; today date; v integer; old_shots integer;
begin
 if auth.uid() is null then raise exception 'Sign in to save shots' using errcode='42501'; end if;
 select * into c from public.shooting_challenges where id=p_id for update;
 if not found then raise exception 'Challenge unavailable' using errcode='42501'; end if;
 staff := public.is_team_adult(c.team_id,auth.uid());
 select * into e from public.shooting_challenge_players where challenge_id=p_id and player_id=p_player;
 if not found then raise exception 'Player is not enrolled in this challenge' using errcode='42501'; end if;
 if not staff and not (exists(select 1 from public.players p where p.id=p_player and
   (p.owner_user_id=auth.uid() or exists(select 1 from public.player_guardians g where g.player_id=p_player and g.user_id=auth.uid())))
   and exists(select 1 from public.team_memberships m where m.team_id=c.team_id and m.player_id=p_player and m.status='active')) then
   raise exception 'You can only save shots for your child on this team' using errcode='42501';
 end if;
 if p_request is null or p_shots is null or p_shots not between 0 and 10000 or p_version is null or p_version<0 or p_date is null then
   raise exception 'Enter a whole number from 0 to 10,000' using errcode='22023';
 end if;
 -- Shared lock for a request UUID prevents reusing it across different challenges concurrently.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,1));
 select * into a from public.shooting_challenge_audit where request_id=p_request;
 if found then
   if a.actor_id<>auth.uid() or a.challenge_id<>p_id or a.player_id<>p_player or a.shot_date<>p_date or a.shots<>p_shots or a.reason is distinct from nullif(btrim(p_reason),'') then
     raise exception 'Retry does not match the original save' using errcode='22023';
   end if;
   select * into d from public.shooting_challenge_days where challenge_id=p_id and player_id=p_player and shot_date=p_date;
   return jsonb_build_object('shots',d.shots,'version',d.version,'replayed',true);
 end if;
 today := (clock_timestamp() at time zone c.timezone)::date;
 if p_date<c.start_date or p_date>c.end_date or p_date>today or p_date<(e.enrolled_at at time zone c.timezone)::date then
   raise exception 'Choose a date within this player’s eligible challenge dates' using errcode='22023';
 end if;
 if staff and nullif(btrim(p_reason),'') is not null then
   if p_reason is null or length(btrim(p_reason)) not between 3 and 500 then
     raise exception 'Give a correction reason (3–500 characters)' using errcode='22023';
   end if;
 elsif not exists(select 1 from public.players p where p.id=p_player and
   (p.owner_user_id=auth.uid() or exists(select 1 from public.player_guardians g where g.player_id=p_player and g.user_id=auth.uid()))) then
   raise exception 'Give a correction reason when saving for another player' using errcode='42501';
 elsif not exists(select 1 from public.team_memberships m where m.team_id=c.team_id and m.player_id=p_player and m.status='active') then
   raise exception 'Player is no longer on this team' using errcode='42501';
 elsif today<c.start_date or today>c.end_date then
   raise exception 'This challenge is not live. Ask your coach about corrections.' using errcode='22023';
 elsif nullif(btrim(p_reason),'') is not null then
   raise exception 'Only staff can make a coach correction' using errcode='42501';
 end if;
 select * into d from public.shooting_challenge_days where challenge_id=p_id and player_id=p_player and shot_date=p_date;
 v:=coalesce(d.version,0); old_shots:=coalesce(d.shots,0);
 if v<>p_version then
   return jsonb_build_object('conflict',true,'shots',old_shots,'version',v);
 end if;
 insert into public.shooting_challenge_days(challenge_id,player_id,shot_date,shots,version)
 values(p_id,p_player,p_date,p_shots,v+1)
 on conflict(challenge_id,player_id,shot_date) do update set shots=excluded.shots,version=excluded.version,updated_at=clock_timestamp();
 insert into public.shooting_challenge_audit(request_id,challenge_id,player_id,shot_date,actor_id,previous_shots,shots,version,reason)
 values(p_request,p_id,p_player,p_date,auth.uid(),old_shots,p_shots,v+1,nullif(btrim(p_reason),''));
 return jsonb_build_object('shots',p_shots,'version',v+1,'replayed',false);
end;
$$;

-- Serialize roster activation with publication before the enrollment trigger runs.
create function hockey_private.lock_shooting_roster() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 perform 1 from public.teams where id=new.team_id for update;
 return new;
end;
$$;
create trigger lock_shooting_roster before insert or update of status on public.team_memberships
for each row execute function hockey_private.lock_shooting_roster();

create function public.create_shooting_challenge(p_id uuid,p_team uuid,p_name text,p_start date,p_end date,p_timezone text) returns uuid
language sql security invoker set search_path = '' as $$ select hockey_private.create_shooting(p_id,p_team,p_name,p_start,p_end,p_timezone); $$;
create function public.get_shooting_challenge(p_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select hockey_private.shooting_snapshot(p_id); $$;
create function public.save_shooting_challenge_day(p_id uuid,p_player uuid,p_date date,p_shots integer,p_version integer,p_request uuid,p_reason text default null) returns jsonb
language sql security invoker set search_path = '' as $$ select hockey_private.save_shooting(p_id,p_player,p_date,p_shots,p_version,p_request,p_reason); $$;

revoke all on all functions in schema hockey_private from public,anon,authenticated;
grant execute on function hockey_private.can_read_shooting(uuid),hockey_private.create_shooting(uuid,uuid,text,date,date,text),hockey_private.shooting_snapshot(uuid),hockey_private.save_shooting(uuid,uuid,date,integer,integer,uuid,text) to authenticated;
revoke all on function public.create_shooting_challenge(uuid,uuid,text,date,date,text),public.get_shooting_challenge(uuid),public.save_shooting_challenge_day(uuid,uuid,date,integer,integer,uuid,text) from public,anon;
grant execute on function public.create_shooting_challenge(uuid,uuid,text,date,date,text),public.get_shooting_challenge(uuid),public.save_shooting_challenge_day(uuid,uuid,date,integer,integer,uuid,text) to authenticated;

create function hockey_private.list_shooting(p_team uuid,p_player uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to view challenges' using errcode='42501'; end if;
 if p_player is not null and not exists(select 1 from public.players p where p.id=p_player and
 (p.owner_user_id=auth.uid() or exists(select 1 from public.player_guardians g where g.player_id=p.id and g.user_id=auth.uid()))) then
   raise exception 'Player unavailable' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(to_jsonb(c) order by c.end_date desc,c.created_at desc) from (
   select c.id,c.name,c.team_id,c.start_date,c.end_date,c.timezone,c.created_at,
   case when (now() at time zone c.timezone)::date<c.start_date then 'Scheduled'
   when (now() at time zone c.timezone)::date>c.end_date then 'Finished' else 'Live' end as status
   from public.shooting_challenges c where hockey_private.can_read_shooting(c.team_id)
   and (p_team is null or c.team_id=p_team)
   and (p_player is null or exists(select 1 from public.shooting_challenge_players e
     join public.team_memberships m on m.player_id=e.player_id and m.team_id=c.team_id and m.status='active'
     where e.challenge_id=c.id and e.player_id=p_player))
   order by c.end_date desc,c.created_at desc limit 20
 )c),'[]'::jsonb);
end;
$$;
create function public.list_shooting_challenges(p_team uuid default null,p_player uuid default null) returns jsonb
language sql security invoker set search_path = '' as $$ select hockey_private.list_shooting(p_team,p_player); $$;
revoke all on function hockey_private.list_shooting(uuid,uuid),public.list_shooting_challenges(uuid,uuid) from public,anon;
grant execute on function hockey_private.list_shooting(uuid,uuid),public.list_shooting_challenges(uuid,uuid) to authenticated;
