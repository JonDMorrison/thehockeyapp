import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/app/Toast";
import { SkeletonListItem } from "@/components/app/Skeleton";
import { Loader2, Copy, Check, Link as LinkIcon, RefreshCw, Calendar } from "lucide-react";

interface InviteParentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
}

export const InviteParentsModal: React.FC<InviteParentsModalProps> = ({
  open,
  onOpenChange,
  teamId,
  teamName,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Fetch current active invite
  const { data: invite, isLoading } = useQuery({
    queryKey: ["team-parent-invite", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*")
        .eq("team_id", teamId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!user,
  });

  // Generate/regenerate invite
  const regenerateInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("regenerate_team_invite", {
        p_team_id: teamId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; token?: string; expires_at?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to generate invite");
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-parent-invite", teamId] });
      toast.success("Invite created", "Share the link with parents.");
      setShowRegenerateConfirm(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to generate invite", error.message);
    },
  });

  const inviteLink = invite?.token 
    ? `${window.location.origin}/join/${invite.token}` 
    : null;

  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied", "Share it with parents.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy", "Please copy the link manually.");
    }
  };

  const handleCopyWithMessage = async () => {
    if (!inviteLink) return;

    const message = `Hi parents — use this link to join our training hub and add your player:\n${inviteLink}`;

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied", "Ready to paste in TeamSnap or email.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy", "Please copy the link manually.");
    }
  };

  const isExpired = invite?.expires_at && new Date(invite.expires_at) < new Date();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Parents</DialogTitle>
            <DialogDescription>
              Share this link with parents to let them join {teamName}.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-4">
              <SkeletonListItem />
            </div>
          ) : !invite || isExpired ? (
            <div className="py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-team-primary/10 flex items-center justify-center mx-auto mb-4">
                <LinkIcon className="w-6 h-6 text-team-primary" />
              </div>
              <p className="text-sm text-text-muted mb-4">
                {isExpired 
                  ? "Your invite link has expired. Generate a new one."
                  : "Generate an invite link to share with parents."}
              </p>
              <Button
                variant="team"
                onClick={() => regenerateInvite.mutate()}
                disabled={regenerateInvite.isPending}
              >
                {regenerateInvite.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate Invite Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-success-muted border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4 text-success" />
                  <p className="text-sm font-medium text-success">Active Invite Link</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
                  <Calendar className="w-3 h-3" />
                  Expires {new Date(invite.expires_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <Input value={inviteLink || ""} readOnly className="text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-text-muted mb-2">
                  Quick message to copy for TeamSnap/email:
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleCopyWithMessage}
                >
                  <Copy className="w-3 h-3" />
                  Copy with Message
                </Button>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRegenerateConfirm(true)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Link
                </Button>
                <Button variant="team" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Invite Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current link. Anyone who hasn't joined yet
              will need the new link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateInvite.mutate()}
              className="bg-team-primary text-primary-foreground hover:bg-team-primary/90"
            >
              {regenerateInvite.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
