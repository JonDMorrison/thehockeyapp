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
 on conflict(challenge_id,player_id,shot_date) do update set shots=excluded.shots,version=excluded.version,updated_at=clock_timestamp();
 insert into public.shooting_challenge_audit(request_id,challenge_id,player_id,shot_date,actor_id,previous_shots,shots,version,reason)
 values(p_request,p_id,p_player,p_date,auth.uid(),old_shots,p_shots,v+1,nullif(btrim(p_reason),''));
 return jsonb_build_object('shots',p_shots,'version',v+1,'replayed',false);
end;
$$;

-- Serialize roster activation with publication before the enrollment trigger runs.
