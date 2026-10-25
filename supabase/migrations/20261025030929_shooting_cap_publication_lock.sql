-- Publication retries serialize with coach cap edits as well as other publications.
create or replace function hockey_private.create_capped_shooting(p_id uuid,p_team uuid,p_name text,p_start date,p_end date,p_timezone text,p_daily_cap integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; existing public.shooting_challenges;
begin
 if auth.uid() is null or not public.is_team_adult(p_team,auth.uid()) then
   raise exception 'Only team staff can publish a challenge' using errcode='42501';
 end if;
 if p_daily_cap is null or p_daily_cap not between 1 and 10000 then
   raise exception 'Choose a daily cap from 1 to 10,000' using errcode='22023';
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
