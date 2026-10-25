create or replace function hockey_private.shooting_rewards(p_player uuid,p_claim boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare total bigint; result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.players p where p.id=p_player and (p.owner_user_id=auth.uid() or public.is_player_guardian(p.id,auth.uid()))) then
 raise exception 'Only this player or family can open shooting rewards' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_player::text,7));
 -- Shared practice in concurrent challenges counts once per calendar date.
 select coalesce(sum(shots),0) into total from (
 select shot_date,max(shots) shots from (
  select shot_date,max(shots) shots from public.shooting_challenge_days where player_id=p_player group by shot_date
  union all
  select card.date as shot_date,sum(greatest(coalesce(done.shots_logged,0),0)) shots
   from public.task_completions done join public.practice_tasks task on task.id=done.practice_task_id
   join public.practice_cards card on card.id=task.practice_card_id
   where done.player_id=p_player group by card.date
 ) recorded group by shot_date
) daily;
 insert into hockey_private.shooting_milestones(player_id,threshold) select p_player,n from unnest(array[1,100,1000]) n where total>=n on conflict do nothing;
 select coalesce(jsonb_agg(jsonb_build_object('threshold',threshold,'earned_at',earned_at,'unveiled',revealed_at is not null) order by threshold),'[]'::jsonb) into result from hockey_private.shooting_milestones where player_id=p_player and (not p_claim or revealed_at is null);
 if p_claim then update hockey_private.shooting_milestones set revealed_at=now() where player_id=p_player and revealed_at is null; end if;
 return result;
end;$$;