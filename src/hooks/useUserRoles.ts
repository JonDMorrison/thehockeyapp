import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "association" | "coach" | "parent" | "player";

export interface UserRoleInfo {
  /** User has access to at least one association workspace */
  isAssociation: boolean;
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
  /** Associations where the user is an owner, director, admin, or viewer */
  associationWorkspaces: Array<{
    associationId: string;
    associationName: string;
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
 * - An association owner/director/admin/viewer
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

  const { data: associationRoles, isLoading: associationLoading } = useQuery({
    queryKey: ["user-association-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("association_roles")
        .select(`
          role,
          association_id,
          associations (
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

  // Fetch the account holder's own adult player profile.
  const { data: ownPlayerData, isLoading: ownPlayerLoading } = useQuery({
    queryKey: ["user-own-player", user?.id],
    queryFn: async () => {
      const adultBirthYear = new Date().getFullYear() - 18;
      const { data, error } = await supabase
        .from("players")
        .select("id, first_name, last_initial, birth_year")
        .eq("owner_user_id", user!.id)
        .lte("birth_year", adultBirthYear);

      if (error) throw error;
      
      // Return the first adult player profile owned by this user
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  const isLoading = authLoading || associationLoading || coachLoading || guardianLoading || ownPlayerLoading;

  const associationWorkspaces = useMemo(() => (associationRoles || []).map((r: { association_id: string; role: string; associations: { id: string; name: string } | null }) => ({
    associationId: r.association_id,
    associationName: r.associations?.name || "Unknown Association",
    role: r.role,
  })), [associationRoles]);

  const coachTeams = useMemo(() => (coachRoles || []).map((r: { team_id: string; role: string; teams: { id: string; name: string } | null }) => ({
    teamId: r.team_id,
    teamName: r.teams?.name || "Unknown Team",
    role: r.role,
  })), [coachRoles]);

  const guardedPlayers = useMemo(() => (guardianRoles || []).map((r: { player_id: string; guardian_role: string; players: { id: string; first_name: string; last_initial: string | null } | null }) => ({
    playerId: r.player_id,
    playerName: `${r.players?.first_name || "Unknown"} ${r.players?.last_initial || ""}`.trim(),
    guardianRole: r.guardian_role,
  })), [guardianRoles]);

  const isCoach = coachTeams.length > 0;
  const isAssociation = associationWorkspaces.length > 0;
  const isParent = guardedPlayers.length > 0;
  const hasOwnPlayerProfile = !!ownPlayerData;

  const ownPlayer = useMemo(() => ownPlayerData
    ? {
        id: ownPlayerData.id,
        firstName: ownPlayerData.first_name,
        lastName: ownPlayerData.last_initial,
      }
    : null, [ownPlayerData]);

  const availableRoles = useMemo(() => {
    const roles: UserRole[] = [];
    if (isAssociation) roles.push("association");
    if (isCoach) roles.push("coach");
    if (isParent) roles.push("parent");
    if (hasOwnPlayerProfile) roles.push("player");
    return roles;
  }, [hasOwnPlayerProfile, isAssociation, isCoach, isParent]);

  return {
    isAssociation,
    isCoach,
    isParent,
    hasOwnPlayerProfile,
    ownPlayerId: ownPlayer?.id || null,
    associationWorkspaces,
    coachTeams,
    guardedPlayers,
    ownPlayer,
    availableRoles,
    isLoading,
  };
}
