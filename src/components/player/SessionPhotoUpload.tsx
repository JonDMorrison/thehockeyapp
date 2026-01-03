import React, { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "@/components/app/Toast";
import { Camera, Trash2, Loader2, X, Share2 } from "lucide-react";

interface SessionPhoto {
  id: string;
  storage_path: string;
  visibility: string;
  caption: string | null;
  created_at: string;
}

interface SessionPhotoUploadProps {
  practiceCardId: string;
  playerId: string;
  playerName: string;
  disabled?: boolean;
}

interface QueuedPhoto {
  id: string;
  localUri: string;
  caption: string;
  visibility: 'parent_only' | 'team_adults';
  status: 'pending' | 'uploading' | 'succeeded' | 'failed';
}

export const SessionPhotoUpload: React.FC<SessionPhotoUploadProps> = ({
  practiceCardId,
  playerId,
  playerName,
  disabled = false,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [shareWithCoaches, setShareWithCoaches] = useState(false);
  const [localQueuedPhotos, setLocalQueuedPhotos] = useState<QueuedPhoto[]>([]);

  // Fetch existing photos
  const { data: photos } = useQuery({
    queryKey: ["session-photos", practiceCardId, playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_photos")
        .select("*")
        .eq("practice_card_id", practiceCardId)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SessionPhoto[];
    },
    enabled: !!practiceCardId && !!playerId,
  });

  // Upload photo mutation
  const uploadPhoto = useMutation({
    mutationFn: async ({
      file,
      caption,
      visibility,
    }: {
      file: File;
      caption: string;
      visibility: 'parent_only' | 'team_adults';
    }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `sessions/${practiceCardId}/${playerId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("session-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create session_photos record
      const { error: insertError } = await supabase
        .from("session_photos")
        .insert({
          practice_card_id: practiceCardId,
          player_id: playerId,
          uploaded_by_user_id: user!.id,
          storage_path: filePath,
          visibility,
          caption: caption || null,
        });

      if (insertError) throw insertError;

      return filePath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-photos", practiceCardId, playerId] });
      toast.success("Photo saved", "Your proof-of-work has been uploaded.");
      resetUploadState();
    },
    onError: (error: Error) => {
      toast.error("Upload failed", error.message);
      // Could add to local queue here for offline retry
    },
  });

  // Delete photo mutation
  const deletePhoto = useMutation({
    mutationFn: async (photo: SessionPhoto) => {
      // Delete from storage
      await supabase.storage.from("session-photos").remove([photo.storage_path]);
      
      // Delete record
      const { error } = await supabase
        .from("session_photos")
        .delete()
        .eq("id", photo.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-photos", practiceCardId, playerId] });
      toast.success("Photo deleted");
    },
    onError: (error: Error) => {
      toast.error("Delete failed", error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setShowUploadSheet(true);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    
    uploadPhoto.mutate({
      file: selectedFile,
      caption,
      visibility: shareWithCoaches ? "team_adults" : "parent_only",
    });
  };

  const resetUploadState = () => {
    setShowUploadSheet(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setCaption("");
    setShareWithCoaches(false);
  };

  const getPhotoUrl = (storagePath: string) => {
    const { data } = supabase.storage.from("session-photos").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const photoCount = (photos?.length || 0) + localQueuedPhotos.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-text-muted">Proof (optional)</Label>
        <span className="text-xs text-text-muted">{photoCount}/3</span>
      </div>

      {/* Photo thumbnails */}
      <div className="flex items-center gap-2 flex-wrap">
        {photos?.slice(0, 3).map((photo) => (
          <div
            key={photo.id}
            className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-muted group"
          >
            <img
              src={getPhotoUrl(photo.storage_path)}
              alt="Session proof"
              className="w-full h-full object-cover"
            />
            {photo.visibility === "team_adults" && (
              <div className="absolute top-1 right-1 w-4 h-4 bg-team-primary rounded-full flex items-center justify-center">
                <Share2 className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            <button
              onClick={() => deletePhoto.mutate(photo)}
              disabled={deletePhoto.isPending}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {deletePhoto.isPending ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        ))}

        {/* Queued photos */}
        {localQueuedPhotos.map((queued) => (
          <div
            key={queued.id}
            className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-muted"
          >
            <img
              src={queued.localUri}
              alt="Pending upload"
              className="w-full h-full object-cover opacity-50"
            />
            {queued.status === "pending" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            )}
          </div>
        ))}

        {/* Add photo button */}
        {photoCount < 3 && !disabled && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:bg-surface-muted transition-colors"
          >
            <Camera className="w-5 h-5 text-text-muted" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Upload Sheet */}
      <Sheet open={showUploadSheet} onOpenChange={setShowUploadSheet}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Add Photo</SheetTitle>
            <SheetDescription>
              Add a proof-of-work photo for {playerName}
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {/* Preview */}
            {previewUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-surface-muted">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={resetUploadState}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a note..."
                maxLength={200}
              />
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-surface-muted">
              <div className="space-y-0.5">
                <Label htmlFor="share">Share with coaches</Label>
                <p className="text-xs text-text-muted">
                  {shareWithCoaches
                    ? "Coaches and managers can view this photo"
                    : "Only you can view this photo"}
                </p>
              </div>
              <Switch
                id="share"
                checked={shareWithCoaches}
                onCheckedChange={setShareWithCoaches}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetUploadState}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpload}
                disabled={!selectedFile || uploadPhoto.isPending}
              >
                {uploadPhoto.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Save Photo
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
