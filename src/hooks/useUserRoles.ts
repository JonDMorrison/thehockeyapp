import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "coach" | "parent" | "player";

export interface UserRoleInfo {
  /** User is a coach/assistant/manager on at least one team */
  isCoach: boolean;
  /** User is a guardian of at least one player */
  isParent: boolean;
  /** User has their own player profile (for adults who train) */
  hasOwnPlayerProfile: boolean;
  /** The user's own player ID if they have one */
  ownPlayerId: string | null;
  /** Teams where user is coach/adult */
  coachTeams: Array<{
    teamId: string;
    teamName: string;
    role: string;
  }>;
  /** Players the user is guardian of */
  guardedPlayers: Array<{
    playerId: string;
    playerName: string;
    guardianRole: string;
  }>;
  /** User's own player profile if they participate */
  ownPlayer: {
    id: string;
    firstName: string;
    lastName: string | null;
  } | null;
  /** All available roles for this user */
  availableRoles: UserRole[];
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook to determine all roles a user has in the system.
 * A user can be:
 * - A coach/assistant/manager on teams
 * - A parent/guardian of players
 * - A player themselves (adults who participate in training)
 */
export function useUserRoles(): UserRoleInfo {
  const { user, loading: authLoading } = useAuth();

  // Fetch coach roles
  const { data: coachRoles, isLoading: coachLoading } = useQuery({
    queryKey: ["user-coach-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_roles")
        .select(`
          role,
          team_id,
          teams (
            id,
            name
          )
        `)
        .eq("user_id", user!.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch guardian relationships
  const { data: guardianRoles, isLoading: guardianLoading } = useQuery({
    queryKey: ["user-guardian-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_guardians")
        .select(`
          guardian_role,
          player_id,
          players (
            id,
            first_name,
            last_initial
          )
        `)
        .eq("user_id", user!.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch user's own player profile (where they are the owner AND it's marked as their personal profile)
  // We identify "own player profile" as a player where owner_user_id matches and birth_year indicates adult
  const { data: ownPlayerData, isLoading: ownPlayerLoading } = useQuery({
    queryKey: ["user-own-player", user?.id],
    queryFn: async () => {
      // Get players owned by this user where birth year indicates adult (born before 2008)
      const { data, error } = await supabase
        .from("players")
        .select("id, first_name, last_initial, birth_year")
        .eq("owner_user_id", user!.id)
        .lt("birth_year", 2008); // Adults are born before 2008

      if (error) throw error;
      
      // Return the first adult player profile owned by this user
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  const isLoading = authLoading || coachLoading || guardianLoading || ownPlayerLoading;

  const coachTeams = (coachRoles || []).map((r: any) => ({
    teamId: r.team_id,
    teamName: r.teams?.name || "Unknown Team",
    role: r.role,
  }));

  const guardedPlayers = (guardianRoles || []).map((r: any) => ({
    playerId: r.player_id,
    playerName: `${r.players?.first_name || "Unknown"} ${r.players?.last_initial || ""}`.trim(),
    guardianRole: r.guardian_role,
  }));

  const isCoach = coachTeams.length > 0;
  const isParent = guardedPlayers.length > 0;
  const hasOwnPlayerProfile = !!ownPlayerData;

  const ownPlayer = ownPlayerData
    ? {
        id: ownPlayerData.id,
        firstName: ownPlayerData.first_name,
        lastName: ownPlayerData.last_initial,
      }
    : null;

  const availableRoles: UserRole[] = [];
  if (isCoach) availableRoles.push("coach");
  if (isParent) availableRoles.push("parent");
  if (hasOwnPlayerProfile) availableRoles.push("player");

  return {
    isCoach,
    isParent,
    hasOwnPlayerProfile,
    ownPlayerId: ownPlayer?.id || null,
    coachTeams,
    guardedPlayers,
    ownPlayer,
    availableRoles,
    isLoading,
  };
}
