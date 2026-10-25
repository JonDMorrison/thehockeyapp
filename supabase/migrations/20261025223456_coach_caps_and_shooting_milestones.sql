-- Zero means no competition cap; entry validation remains separate.
alter table public.shooting_challenges drop constraint shooting_challenges_daily_cap_check;
alter table public.shooting_challenges add constraint shooting_challenges_daily_cap_check check(daily_cap between 0 and 10000);
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
   coalesce(sum(least(coalesce(d.shots,0),(case when c.daily_cap=0 then 10000 else c.daily_cap end))),0) as total,
   case when staff or exists(select 1 from public.players own where own.id=e.player_id and (own.owner_user_id=auth.uid() or public.is_player_guardian(own.id,auth.uid()))) then coalesce(sum(d.shots),0) else coalesce(sum(least(coalesce(d.shots,0),(case when c.daily_cap=0 then 10000 else c.daily_cap end))),0) end as raw_total,
   case when staff or exists(select 1 from public.players own where own.id=e.player_id and (own.owner_user_id=auth.uid() or public.is_player_guardian(own.id,auth.uid()))) then coalesce(sum(greatest(d.shots-(case when c.daily_cap=0 then 10000 else c.daily_cap end),0)),0) else 0 end as bonus_total,
   false as bonus_boss,
   case when coalesce(sum(least(coalesce(d.shots,0),(case when c.daily_cap=0 then 10000 else c.daily_cap end))),0)>0 then rank() over(order by coalesce(sum(least(coalesce(d.shots,0),(case when c.daily_cap=0 then 10000 else c.daily_cap end))),0) desc) else null end as rank,
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
create or replace function hockey_private.create_capped_shooting(p_id uuid,p_team uuid,p_name text,p_start date,p_end date,p_timezone text,p_daily_cap integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; existing public.shooting_challenges;
begin
 if auth.uid() is null or not public.is_team_adult(p_team,auth.uid()) then
   raise exception 'Only team staff can publish a challenge' using errcode='42501';
 end if;
 if p_daily_cap is null or p_daily_cap not between 0 and 10000 then
   raise exception 'Choose a daily cap from 0 (no cap) to 10,000' using errcode='22023';
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
 if p_daily_cap is null or p_daily_cap not between 0 and 10000 or p_expected_cap is null then
   raise exception 'Choose a daily cap from 0 (no cap) to 10,000' using errcode='22023';
 end if;
 if c.daily_cap<>p_expected_cap and c.daily_cap<>p_daily_cap then
   raise exception 'Another coach changed the cap. Refresh and review before saving.' using errcode='40001';
 end if;
 update public.shooting_challenges set daily_cap=p_daily_cap where id=p_id;
 return jsonb_build_object('daily_cap',p_daily_cap);
end;
$$;
create table hockey_private.shooting_milestones (
 player_id uuid references public.players(id) on delete cascade,
 threshold integer check(threshold in (1,100,1000)), earned_at timestamptz not null default now(), revealed_at timestamptz,
 primary key(player_id,threshold)
);
alter table hockey_private.shooting_milestones enable row level security;
revoke all on hockey_private.shooting_milestones from public,anon,authenticated;
create function hockey_private.shooting_rewards(p_player uuid,p_claim boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare total bigint; result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.players p where p.id=p_player and (p.owner_user_id=auth.uid() or public.is_player_guardian(p.id,auth.uid()))) then
 raise exception 'Only this player or family can open shooting rewards' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_player::text,7));
 -- Shared practice in concurrent challenges counts once per calendar date.
 select coalesce(sum(shots),0) into total from (select shot_date,max(shots) shots from public.shooting_challenge_days where player_id=p_player group by shot_date) d;
 insert into hockey_private.shooting_milestones(player_id,threshold) select p_player,n from unnest(array[1,100,1000]) n where total>=n on conflict do nothing;
 select coalesce(jsonb_agg(jsonb_build_object('threshold',threshold,'earned_at',earned_at,'unveiled',revealed_at is not null) order by threshold),'[]'::jsonb) into result from hockey_private.shooting_milestones where player_id=p_player and (not p_claim or revealed_at is null);
 if p_claim then update hockey_private.shooting_milestones set revealed_at=now() where player_id=p_player and revealed_at is null; end if;
 return result;
end;$$;
create function public.shooting_rewards(p_player uuid,p_claim boolean default false) returns jsonb language sql security invoker set search_path='' as $$select hockey_private.shooting_rewards(p_player,p_claim);$$;
revoke all on function public.shooting_rewards(uuid,boolean),hockey_private.shooting_rewards(uuid,boolean) from public,anon;
grant execute on function public.shooting_rewards(uuid,boolean),hockey_private.shooting_rewards(uuid,boolean) to authenticated;
