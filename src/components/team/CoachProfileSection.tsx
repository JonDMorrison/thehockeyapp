import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/app/Toast";
import { User, Camera, Loader2, Heart, Trophy, MessageCircle } from "lucide-react";

interface CoachProfileSectionProps {
  teamId?: string;
  /** Whether this user has coach roles - controls showing coach bio questions */
  isCoach?: boolean;
}

interface ProfileData {
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string | null;
  avatar_url?: string | null;
  coach_why?: string | null;
  coach_love?: string | null;
  coach_memory?: string | null;
  updated_at?: string | null;
}

export const CoachProfileSection: React.FC<CoachProfileSectionProps> = ({ 
  teamId: _teamId,
  isCoach = true 
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState("");
  const [coachWhy, setCoachWhy] = useState("");
  const [coachLove, setCoachLove] = useState("");
  const [coachMemory, setCoachMemory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current profile
  const { data: profile, isLoading } = useQuery<ProfileData | null>({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data as ProfileData;
    },
    enabled: !!user,
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setCoachWhy(profile.coach_why || "");
      setCoachLove(profile.coach_love || "");
      setCoachMemory(profile.coach_memory || "");
    }
  }, [profile]);

  // Track changes - allow saving even if no profile exists yet
  useEffect(() => {
    if (profile) {
      const changed = 
        displayName !== (profile.display_name || "") ||
        coachWhy !== (profile.coach_why || "") ||
        coachLove !== (profile.coach_love || "") ||
        coachMemory !== (profile.coach_memory || "");
      setHasChanges(changed);
    } else if (!isLoading) {
      // No profile yet - any content means we have changes to save
      const hasContent = displayName.trim() || coachWhy.trim() || coachLove.trim() || coachMemory.trim();
      setHasChanges(!!hasContent);
    }
  }, [displayName, coachWhy, coachLove, coachMemory, profile, isLoading]);

  // Upload avatar
  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("team-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("team-media")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl } as any)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["coach-profile"] });
      toast.success("Photo updated!");
    } catch (error: any) {
      toast.error("Upload failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  // Save profile
  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      const updateData: Record<string, any> = {
        display_name: displayName.trim() || null,
      };
      
      // Only include coach fields if user is a coach
      if (isCoach) {
        updateData.coach_why = coachWhy.trim() || null;
        updateData.coach_love = coachLove.trim() || null;
        updateData.coach_memory = coachMemory.trim() || null;
      }
      
      const { error } = await supabase
        .from("profiles")
        .update(updateData as any)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["coach-profile"] });
      setHasChanges(false);
      toast.success("Profile saved!");
    },
    onError: (error: Error) => {
      toast.error("Failed to save", error.message);
    },
  });

  if (isLoading) {
    return (
      <AppCard>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-3 bg-muted rounded w-48" />
            </div>
          </div>
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard>
      <AppCardTitle className="flex items-center gap-2 mb-1">
        <User className="w-4 h-4 text-team-primary" />
        My Profile
      </AppCardTitle>
      <AppCardDescription className="mb-4">
        {isCoach ? "Your photo and bio visible to your team" : "Your profile information"}
      </AppCardDescription>

      <div className="space-y-6">
        {/* Avatar and Name */}
        <div className="flex items-start gap-4">
          <div className="relative group">
            <Avatar
              src={profile?.avatar_url}
              fallback={displayName || profile?.email || "U"}
              size="xl"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar(file);
              }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={isCoach ? "Coach Smith" : "Your name"}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {isCoach 
                ? "This is how players and parents will see you" 
                : "This is how others will see you"}
            </p>
          </div>
        </div>

        {/* Coach Questions - Only show for coaches */}
        {isCoach && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-team-primary" />
              <p className="text-sm font-medium text-foreground">
                Coach Bio
              </p>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Help your team get to know you better
            </p>

            <div className="space-y-2">
              <Label htmlFor="coachWhy" className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                Why do you coach?
              </Label>
              <Textarea
                id="coachWhy"
                value={coachWhy}
                onChange={(e) => setCoachWhy(e.target.value)}
                placeholder="I love seeing kids develop their skills and confidence..."
                rows={2}
                maxLength={300}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {coachWhy.length}/300
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coachLove" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-500" />
                What do you love about coaching?
              </Label>
              <Textarea
                id="coachLove"
                value={coachLove}
                onChange={(e) => setCoachLove(e.target.value)}
                placeholder="The energy at practice, watching breakthroughs happen..."
                rows={2}
                maxLength={300}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {coachLove.length}/300
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coachMemory" className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                What's your best hockey memory?
              </Label>
              <Textarea
                id="coachMemory"
                value={coachMemory}
                onChange={(e) => setCoachMemory(e.target.value)}
                placeholder="Scoring my first goal, winning provincials, a great team moment..."
                rows={2}
                maxLength={300}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {coachMemory.length}/300
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={() => saveProfile.mutate()}
          disabled={!hasChanges || saveProfile.isPending}
          className="w-full"
          variant="team"
        >
          {saveProfile.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Profile"
          )}
        </Button>
      </div>
    </AppCard>
  );
};