\set ON_ERROR_STOP on
create function public.test_assert(ok boolean,label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end; $$;
create function public.test_denied(statement text,code text,label text) returns void language plpgsql as $$
begin
 begin execute statement; exception when others then
   if sqlstate=code then raise notice 'PASS: %',label; return; end if;
   raise exception 'FAIL: % (unexpected %: %)',label,sqlstate,sqlerrm;
 end;
 raise exception 'FAIL: % (request accepted)',label;
end; $$;
insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into public.teams values('10000000-0000-0000-0000-000000000001','Test team'),('10000000-0000-0000-0000-000000000002','Other team');
insert into public.team_roles values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
insert into public.players values
('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Alex','A'),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Blair','B'),
('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','Casey','C');
insert into public.player_guardians values('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
insert into public.team_memberships(team_id,player_id,status) values
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','active'),
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','active'),
('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','active');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.create_shooting_challenge('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Test race',current_date,current_date,'UTC');
select public.test_assert(jsonb_array_length(public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')->'players')=2,'Full roster enrolled, including zero-shot players');
select public.test_assert((public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')->'players'->0->>'rank') is null,'Zero shots do not receive winning ranks');
select public.test_assert(public.create_shooting_challenge('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Test race',current_date,current_date,'UTC')='30000000-0000-0000-0000-000000000001','Publication retry is idempotent');
select public.test_denied($q$select public.create_shooting_challenge('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Changed race',current_date,current_date,'UTC')$q$,'22023','Publication request cannot change on retry');
select public.test_denied($q$select public.create_shooting_challenge(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','Bad dates',current_date,current_date-1,'UTC')$q$,'22023','Reversed dates rejected');
select public.test_denied($q$select public.create_shooting_challenge(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','Bad zone',current_date,current_date,'Fake/Zone')$q$,'22023','Invalid time zone rejected');
select public.test_denied($q$select public.create_shooting_challenge(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','Past',current_date-1,current_date,'UTC')$q$,'22023','New challenge cannot import prior days');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_denied($q$select public.create_shooting_challenge(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','Parent race',current_date,current_date,'UTC')$q$,'42501','Parent cannot publish challenge');
select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,150,0,'40000000-0000-0000-0000-000000000001');
select public.test_assert((public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,150,0,'40000000-0000-0000-0000-000000000001')->>'replayed')::boolean,'Lost-response retry returns success without duplicate');
select public.test_assert((public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')->'players'->0->>'total')::int=150,'Save without any workout counts exactly 150');
select public.test_assert((public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,175,0,gen_random_uuid())->>'conflict')::boolean,'Stale device cannot overwrite');
select public.test_assert((public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,175,1,gen_random_uuid())->>'version')::int=2,'Reviewed replacement succeeds');
select public.test_denied($q$select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002',current_date,150,0,'40000000-0000-0000-0000-000000000001')$q$,'22023','Request UUID cannot be reused for a sibling');
select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002',current_date,175,0,gen_random_uuid());
select public.test_assert((public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')->'players'->1->>'rank')::int=1,'Tied players share first place');
select public.test_denied($q$select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,-1,2,gen_random_uuid())$q$,'22023','Negative shots rejected');
select public.test_denied($q$select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,10001,2,gen_random_uuid())$q$,'22023','Over-limit shots rejected');
select public.test_denied($q$select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date+1,10,0,gen_random_uuid())$q$,'22023','Future shots rejected');
select public.test_denied($q$select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date-1,10,0,gen_random_uuid())$q$,'22023','Out-of-range shots rejected');
select public.test_denied($q$update public.shooting_challenge_days set shots=999$q$,'42501','Direct ledger writes denied');
select public.test_denied($q$select * from public.shooting_challenge_audit$q$,'42501','Parents cannot inspect audit records');
select public.test_assert(public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')->'audit'='[]'::jsonb,'Snapshot hides audit records from families');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select public.test_denied($q$select public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')$q$,'42501','Other team/account cannot read challenge');
select public.test_denied($q$select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,999,2,gen_random_uuid())$q$,'42501','Unrelated account cannot write shots');
select public.test_assert(public.list_shooting_challenges()='[]'::jsonb,'List does not leak other teams');
reset role;
insert into public.team_memberships(team_id,player_id,status) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','active');
select public.test_assert((select count(*) from public.shooting_challenge_players where challenge_id='30000000-0000-0000-0000-000000000001')=3,'Late join automatically enrolls');
update public.shooting_challenge_players set enrolled_at=now()-interval '5 days';
-- Fixture-only clock scenarios: production has no client clock override.
update public.shooting_challenges set start_date=current_date-3,end_date=current_date-1;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_denied($q$select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date-1,100,0,gen_random_uuid())$q$,'22023','Finished challenge rejects parent backfill');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.test_denied($q$select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date-1,100,0,gen_random_uuid())$q$,'42501','Coach correction requires reason');
select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date-1,100,0,gen_random_uuid(),'Confirmed missing practice');
select public.test_assert((public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')->>'corrected')::boolean,'Results visibly flag coach corrections');
select public.test_assert(jsonb_array_length(public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')->'audit')=4,'Every successful save audited; retry and conflict add no audit rows');
reset role;
update public.shooting_challenges set start_date=current_date+1,end_date=current_date+3;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_denied($q$select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date+1,10,0,gen_random_uuid())$q$,'22023','Scheduled challenge rejects writes');
reset role;
update public.shooting_challenges set start_date=current_date,end_date=current_date;
update public.team_memberships set status='inactive' where team_id='10000000-0000-0000-0000-000000000001' and player_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.test_denied($q$select public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')$q$,'42501','Removed family immediately loses read access');
select public.test_denied($q$select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,500,2,gen_random_uuid())$q$,'42501','Removed family immediately loses write access');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.test_assert((public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')->'players'->0->>'total')::int=275,'Historical totals remain after removal');
reset role;
set role anon;
select public.test_denied($q$select public.get_shooting_challenge('30000000-0000-0000-0000-000000000001')$q$,'42501','Anonymous snapshot denied');
select public.test_denied($q$select * from public.shooting_challenges$q$,'42501','Anonymous table access denied');
reset role;
select public.test_assert(extract(epoch from ('2026-03-09 00:00'::timestamp at time zone 'America/Vancouver')-('2026-03-08 00:00'::timestamp at time zone 'America/Vancouver'))=23*3600,'Spring clock change gives a 23-hour calendar day');
select public.test_assert(extract(epoch from ('2026-11-02 00:00'::timestamp at time zone 'America/New_York')-('2026-11-01 00:00'::timestamp at time zone 'America/New_York'))=25*3600,'Fall clock change gives a 25-hour calendar day');

select public.test_assert(('2026-10-18 00:00:00+00'::timestamptz at time zone 'UTC')::date='2026-10-18'::date,'Exact first midnight is included');
select public.test_assert(('2026-10-17 23:59:59.999999+00'::timestamptz at time zone 'UTC')::date<'2026-10-18'::date,'Instant before first midnight is excluded');
select public.test_assert(('2026-10-18 23:59:59.999999+00'::timestamptz at time zone 'UTC')::date='2026-10-18'::date,'Last instant of final day is included');
select public.test_assert(('2026-10-19 00:00:00+00'::timestamptz at time zone 'UTC')::date>'2026-10-18'::date,'Exact closing midnight is excluded');
