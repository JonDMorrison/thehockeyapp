-- Private originals enable repeated framing without degrading the saved avatar.
alter table public.players add column profile_photo_original_url text,
  add column profile_photo_frame jsonb;
alter table public.shooting_challenges add column review_threshold integer not null default 1000 check (review_threshold between 301 and 10000);
create table hockey_private.shooting_entry_reviews (
  challenge_id uuid not null references public.shooting_challenges(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  shot_date date not null, version integer not null,
  reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz not null default now(),
  note text not null check (length(btrim(note)) between 3 and 500),
  primary key(challenge_id,player_id,shot_date,version)
);
alter table hockey_private.shooting_entry_reviews enable row level security;
revoke all on hockey_private.shooting_entry_reviews from public,anon,authenticated;
create or replace function hockey_private.shooting_snapshot(p_id uuid) returns jsonb
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
 'cap_locked',exists(select 1 from public.shooting_challenge_days where challenge_id=c.id and shots>0),
 'review_entries',case when staff then coalesce((select jsonb_agg(jsonb_build_object('player_id',d.player_id,'shot_date',d.shot_date,'shots',d.shots,'version',d.version,'reviewed',coalesce(r.version=d.version,false),'note',r.note,'reviewed_at',r.reviewed_at) order by d.shot_date desc) from public.shooting_challenge_days d left join hockey_private.shooting_entry_reviews r on r.challenge_id=d.challenge_id and r.player_id=d.player_id and r.shot_date=d.shot_date and r.version=d.version where d.challenge_id=c.id and d.shots>=c.review_threshold),'[]'::jsonb) else '[]'::jsonb end,
 'challenge',to_jsonb(c), 'team_name',(select name from public.teams where id=c.team_id),
 'server_now',t,'today',today,'is_staff',staff,
 'starts_at',c.start_date::timestamp at time zone c.timezone,
 'ends_at',(c.end_date+1)::timestamp at time zone c.timezone,
 'status',case when today<c.start_date then 'Scheduled' when today>c.end_date then 'Finished' else 'Live' end,
 'players',coalesce((select jsonb_agg(row_to_json(r) order by r.total desc,r.first_name,r.player_id) from (
   select e.player_id,e.first_name,e.last_initial,
   greatest(c.start_date,(e.enrolled_at at time zone c.timezone)::date) as eligible_from,
   coalesce(sum(least(coalesce(d.shots,0),c.daily_cap)),0) as total,
   case when staff or exists(select 1 from public.players own where own.id=e.player_id and (own.owner_user_id=auth.uid() or public.is_player_guardian(own.id,auth.uid()))) then coalesce(sum(d.shots),0) else coalesce(sum(least(coalesce(d.shots,0),c.daily_cap)),0) end as raw_total,
   case when staff or exists(select 1 from public.players own where own.id=e.player_id and (own.owner_user_id=auth.uid() or public.is_player_guardian(own.id,auth.uid()))) then coalesce(sum(greatest(d.shots-c.daily_cap,0)),0) else 0 end as bonus_total,
   false as bonus_boss,
   case when coalesce(sum(least(coalesce(d.shots,0),c.daily_cap)),0)>0 then rank() over(order by coalesce(sum(least(coalesce(d.shots,0),c.daily_cap)),0) desc) else null end as rank,
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
-- Publication retries serialize with coach cap edits as well as other publications.
create or replace function hockey_private.create_capped_shooting(p_id uuid,p_team uuid,p_name text,p_start date,p_end date,p_timezone text,p_daily_cap integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; existing public.shooting_challenges;
begin
 if auth.uid() is null or not public.is_team_adult(p_team,auth.uid()) then
   raise exception 'Only team staff can publish a challenge' using errcode='42501';
 end if;
 if p_daily_cap is null or p_daily_cap not between 1 and 300 then
   raise exception 'Choose a daily cap from 1 to 300' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into existing from public.shooting_challenges where id=p_id for update;
 if found and existing.daily_cap<>p_daily_cap then
   raise exception 'Publication request changed; review and publish again' using errcode='22023';
 end if;
 result := hockey_private.create_shooting(p_id,p_team,p_name,p_start,p_end,p_timezone);
 update public.shooting_challenges set daily_cap=p_daily_cap where id=result;
 return result;
end;
$$;

create or replace function hockey_private.set_shooting_cap(p_id uuid,p_daily_cap integer,p_expected_cap integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.shooting_challenges;
begin
 select * into c from public.shooting_challenges where id=p_id for update;
 if not found or auth.uid() is null or not public.is_team_adult(c.team_id,auth.uid()) then
   raise exception 'Only team staff can change the daily cap' using errcode='42501';
 end if;
 if p_daily_cap is null or p_daily_cap not between 1 and 300 or p_expected_cap is null then
   raise exception 'Choose a daily cap from 1 to 300' using errcode='22023';
 end if;
 if c.daily_cap<>p_expected_cap and c.daily_cap<>p_daily_cap then
   raise exception 'Another coach changed the cap. Refresh and review before saving.' using errcode='40001';
 end if;
 if c.daily_cap<>p_daily_cap and exists(select 1 from public.shooting_challenge_days where challenge_id=c.id and shots>0) then
   raise exception 'The daily cap is locked after the first shots are logged. Start a new challenge to use different rules.' using errcode='22023';
 end if;
 update public.shooting_challenges set daily_cap=p_daily_cap where id=p_id;
 return jsonb_build_object('daily_cap',p_daily_cap);
end;
$$;

create or replace function hockey_private.save_shooting(p_id uuid,p_player uuid,p_date date,p_shots integer,p_version integer,p_request uuid,p_reason text) returns jsonb
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
 elsif p_date<today-2 then
   raise exception 'Families can edit today and the previous two days. Ask your coach to correct an older entry.' using errcode='22023';
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
 on conflict(challenge_id,player_id,shot_date,version) do update set shots=excluded.shots,version=excluded.version,updated_at=clock_timestamp();
 insert into public.shooting_challenge_audit(request_id,challenge_id,player_id,shot_date,actor_id,previous_shots,shots,version,reason)
 values(p_request,p_id,p_player,p_date,auth.uid(),old_shots,p_shots,v+1,nullif(btrim(p_reason),''));
 return jsonb_build_object('shots',p_shots,'version',v+1,'replayed',false);
end;
$$;

-- Serialize roster activation with publication before the enrollment trigger runs.
create function hockey_private.configure_shooting_rules(p_id uuid,p_cap integer,p_expected integer,p_threshold integer) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform hockey_private.set_shooting_cap(p_id,p_cap,p_expected);
 if p_threshold is null or p_threshold not between 301 and 10000 then raise exception 'Choose a review threshold from 301 to 10,000' using errcode='22023'; end if;
 update public.shooting_challenges set review_threshold=p_threshold where id=p_id;
 return jsonb_build_object('daily_cap',p_cap,'review_threshold',p_threshold);
end; $$;
create function public.configure_shooting_rules(p_id uuid,p_cap integer,p_expected integer,p_threshold integer) returns jsonb
language sql security invoker set search_path='' as $$select hockey_private.configure_shooting_rules(p_id,p_cap,p_expected,p_threshold);$$;
create function hockey_private.review_shooting_entry(p_id uuid,p_player uuid,p_date date,p_version integer,p_note text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.shooting_challenges; d public.shooting_challenge_days;
begin
 select * into c from public.shooting_challenges where id=p_id for update;
 if not found or auth.uid() is null or not public.is_team_adult(c.team_id,auth.uid()) then raise exception 'Only team staff can review entries' using errcode='42501'; end if;
 select * into d from public.shooting_challenge_days where challenge_id=p_id and player_id=p_player and shot_date=p_date for update;
 if not found or d.version<>p_version then raise exception 'This entry changed. Refresh and review the latest total.' using errcode='40001'; end if;
 if p_note is null or length(btrim(p_note)) not between 3 and 500 then raise exception 'Add a review note (3–500 characters)' using errcode='22023'; end if;
 insert into hockey_private.shooting_entry_reviews(challenge_id,player_id,shot_date,version,reviewed_by,note)
 values(p_id,p_player,p_date,p_version,auth.uid(),btrim(p_note))
 on conflict(challenge_id,player_id,shot_date,version) do update set version=excluded.version,reviewed_by=excluded.reviewed_by,reviewed_at=clock_timestamp(),note=excluded.note;
 return jsonb_build_object('reviewed',true);
end; $$;
create function public.review_shooting_entry(p_id uuid,p_player uuid,p_date date,p_version integer,p_note text) returns jsonb
language sql security invoker set search_path='' as $$select hockey_private.review_shooting_entry(p_id,p_player,p_date,p_version,p_note);$$;
revoke all on function hockey_private.configure_shooting_rules(uuid,integer,integer,integer),public.configure_shooting_rules(uuid,integer,integer,integer),hockey_private.review_shooting_entry(uuid,uuid,date,integer,text),public.review_shooting_entry(uuid,uuid,date,integer,text) from public,anon;
grant execute on function hockey_private.configure_shooting_rules(uuid,integer,integer,integer),public.configure_shooting_rules(uuid,integer,integer,integer),hockey_private.review_shooting_entry(uuid,uuid,date,integer,text),public.review_shooting_entry(uuid,uuid,date,integer,text) to authenticated;
