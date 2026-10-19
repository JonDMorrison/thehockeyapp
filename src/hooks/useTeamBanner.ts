import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
export type BannerChoice = { preset: string; storage_path: string | null; focal_x: number; focal_y: number };
export const defaultBanner: BannerChoice = { preset: "rink", storage_path: null, focal_x: 50, focal_y: 50 };
export function useTeamBanner(teamId?: string) {
 const { user } = useAuth();
 const queryClient = useQueryClient();
 const queryKey = ["team-banner", user?.id, teamId];
 const query = useQuery({ queryKey, enabled: Boolean(teamId && user), staleTime: 30 * 60 * 1000, refetchInterval: 30 * 60 * 1000,
  queryFn: async () => {
   const { data, error } = await supabase.from("team_banners").select("preset,storage_path,focal_x,focal_y").eq("team_id", teamId!).maybeSingle();
   if (error) throw error;
   const banner = data ?? defaultBanner;
   let imageUrl: string | null = null;
   if (banner.storage_path) {
    const signed = await supabase.storage.from("team-banners").createSignedUrl(banner.storage_path, 3600);
    if (signed.error) throw signed.error;
    imageUrl = signed.data.signedUrl;
   }
   return { ...banner, imageUrl };
  },
 });
 return { ...query, save: async (choice: BannerChoice, file?: File) => {
  if (!teamId || !user || query.isError || query.isPending) throw new Error("Load your current banner before saving.");
  let path: string | undefined;
  try {
   if (file) {
    const extension = ({"image/jpeg":"jpg","image/png":"png","image/webp":"webp"} as Record<string,string>)[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) throw new Error("Choose a JPG, PNG or WebP image under 5 MB.");
    path = `${teamId}/${crypto.randomUUID()}.${extension}`;
    const uploaded = await supabase.storage.from("team-banners").upload(path, file, { upsert: false, contentType: file.type });
    if (uploaded.error) throw uploaded.error;
   }
   const record = { preset: choice.preset, focal_x: choice.focal_x, focal_y: choice.focal_y, team_id: teamId, storage_path: path ?? choice.storage_path };
   // Returning the row proves the staff policy accepted the write.
   const result = await supabase.from("team_banners").upsert(record, { onConflict: "team_id" }).select("team_id").single();
   if (result.error) throw result.error;
  } catch (error) {
   if (path) await supabase.storage.from("team-banners").remove([path]);
   throw error;
  }
  // Keep older saved files: another staff member may be editing from that revision.
  await queryClient.invalidateQueries({queryKey});
 } };
}
