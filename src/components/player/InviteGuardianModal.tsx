import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/app/Toast";
import { Loader2, Copy, Check, Link as LinkIcon, Mail } from "lucide-react";

interface InviteGuardianModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  playerName: string;
}

const emailSchema = z.string().trim().email("Please enter a valid email address");

// Generate a secure random token
function generateToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export const InviteGuardianModal: React.FC<InviteGuardianModalProps> = ({
  open,
  onOpenChange,
  playerId,
  playerName,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createInvite = useMutation({
    mutationFn: async (invitedEmail: string) => {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 14 days from now

      const { data, error } = await supabase
        .from("player_guardian_invites")
        .insert({
          player_id: playerId,
          invited_email: invitedEmail.toLowerCase().trim(),
          token,
          expires_at: expiresAt.toISOString(),
          created_by_user_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { invite: data, token };
    },
    onSuccess: ({ token }) => {
      const link = `${window.location.origin}/guardian/join/${token}`;
      setInviteLink(link);
      queryClient.invalidateQueries({ queryKey: ["player-invites", playerId] });
      toast.success("Invite created", "Share the link with the guardian.");
    },
    onError: (error: Error) => {
      toast.error("Failed to create invite", error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      setError("");
      createInvite.mutate(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied", "Share it with the guardian.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy", "Please copy the link manually.");
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setInviteLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Guardian</DialogTitle>
          <DialogDescription>
            Invite another parent or guardian to help manage {playerName}'s profile.
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-text-muted" />
                Guardian's Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="guardian@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={error ? "border-destructive" : ""}
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="team"
                disabled={createInvite.isPending}
              >
                {createInvite.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Invite
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-success-muted border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-success" />
                <p className="text-sm font-medium text-success">Invite Created!</p>
              </div>
              <p className="text-xs text-text-muted mb-3">
                This link expires in 14 days. Share it with the guardian.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="text-xs"
                />
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

            <DialogFooter>
              <Button type="button" variant="team" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
