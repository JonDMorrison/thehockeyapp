import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function usePlayerPhotoConsent(playerId: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["player-photo-consent", playerId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("player_consents").select("guardian_user_id,photo_sharing_allowed,ai_personalization_allowed,relationship_confirmed,withdrawn_at").eq("player_id", playerId).eq("guardian_user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(playerId && user) && enabled,
  });
}
