-- Create profiles table
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create players table
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_initial text,
  birth_year int NOT NULL,
  shoots text CHECK (shoots IN ('left', 'right', 'unknown')) DEFAULT 'unknown',
  jersey_number text,
  profile_photo_url text,
  fav_nhl_city text,
  fav_nhl_player text,
  hockey_love text,
  season_goals text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create player_guardians table
CREATE TABLE public.player_guardians (
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_role text CHECK (guardian_role IN ('owner', 'guardian')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (player_id, user_id)
);

-- Enable RLS on player_guardians
ALTER TABLE public.player_guardians ENABLE ROW LEVEL SECURITY;

-- Create player_guardian_invites table
CREATE TABLE public.player_guardian_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  token text UNIQUE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')) DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on player_guardian_invites
ALTER TABLE public.player_guardian_invites ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is a guardian of a player
CREATE OR REPLACE FUNCTION public.is_player_guardian(player_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.player_guardians
    WHERE player_id = player_uuid AND user_id = user_uuid
  )
$$;

-- Security definer function to check if user is owner of a player
CREATE OR REPLACE FUNCTION public.is_player_owner(player_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.player_guardians
    WHERE player_id = player_uuid AND user_id = user_uuid AND guardian_role = 'owner'
  )
$$;

-- Players RLS policies
CREATE POLICY "Guardians can view players" ON public.players
  FOR SELECT USING (
    owner_user_id = auth.uid() OR public.is_player_guardian(id, auth.uid())
  );

CREATE POLICY "Users can insert own players" ON public.players
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can update players" ON public.players
  FOR UPDATE USING (
    owner_user_id = auth.uid() OR public.is_player_owner(id, auth.uid())
  );

CREATE POLICY "Owners can delete players" ON public.players
  FOR DELETE USING (owner_user_id = auth.uid());

-- Player guardians RLS policies
CREATE POLICY "Guardians can view player_guardians" ON public.player_guardians
  FOR SELECT USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Owners can insert guardians" ON public.player_guardians
  FOR INSERT WITH CHECK (public.is_player_owner(player_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Owners can delete guardians" ON public.player_guardians
  FOR DELETE USING (public.is_player_owner(player_id, auth.uid()));

-- Player guardian invites RLS policies
CREATE POLICY "Guardians can view invites" ON public.player_guardian_invites
  FOR SELECT USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Anyone can view invite by token" ON public.player_guardian_invites
  FOR SELECT USING (true);

CREATE POLICY "Owners can create invites" ON public.player_guardian_invites
  FOR INSERT WITH CHECK (public.is_player_owner(player_id, auth.uid()));

CREATE POLICY "Owners can update invites" ON public.player_guardian_invites
  FOR UPDATE USING (public.is_player_owner(player_id, auth.uid()));

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name', new.email);
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC function to redeem guardian invite (secure token redemption)
CREATE OR REPLACE FUNCTION public.redeem_guardian_invite(invite_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find the invite
  SELECT * INTO v_invite FROM public.player_guardian_invites
  WHERE token = invite_token AND status = 'pending' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  -- Check if already a guardian
  IF EXISTS (SELECT 1 FROM public.player_guardians WHERE player_id = v_invite.player_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already a guardian of this player');
  END IF;

  -- Add as guardian
  INSERT INTO public.player_guardians (player_id, user_id, guardian_role)
  VALUES (v_invite.player_id, v_user_id, 'guardian');

  -- Mark invite as accepted
  UPDATE public.player_guardian_invites SET status = 'accepted' WHERE id = v_invite.id;

  RETURN json_build_object('success', true, 'player_id', v_invite.player_id);
END;
$$;