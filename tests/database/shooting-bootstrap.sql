-- Isolated PostgreSQL fixture for the existing schema contracts used by this feature.
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public.teams(id uuid primary key,name text);
create table public.players(id uuid primary key,owner_user_id uuid references auth.users(id),first_name text,last_initial text);
create table public.player_guardians(player_id uuid references public.players(id),user_id uuid references auth.users(id));
create table public.team_roles(team_id uuid references public.teams(id),user_id uuid references auth.users(id));
create table public.team_memberships(id uuid primary key default gen_random_uuid(),team_id uuid references public.teams(id),player_id uuid references public.players(id),status text,joined_at timestamptz default now());
create function public.is_team_adult(team_uuid uuid,user_uuid uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.team_roles where team_id=team_uuid and user_id=user_uuid); $$;
