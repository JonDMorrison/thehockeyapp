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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/app/Toast";
import { Loader2, Copy, Check, Link as LinkIcon, Mail, Shield } from "lucide-react";

interface InviteAdultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
}

const emailSchema = z.string().trim().email("Please enter a valid email address");

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

const roleOptions = [
  { value: "assistant_coach", label: "Assistant Coach" },
  { value: "manager", label: "Manager" },
];

export const InviteAdultModal: React.FC<InviteAdultModalProps> = ({
  open,
  onOpenChange,
  teamId,
  teamName,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"assistant_coach" | "manager">("assistant_coach");
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createInvite = useMutation({
    mutationFn: async (invitedEmail: string) => {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const { data, error } = await supabase
        .from("team_adult_invites")
        .insert({
          team_id: teamId,
          invited_email: invitedEmail.toLowerCase().trim(),
          role,
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
      const link = `${window.location.origin}/team/adult/join/${token}`;
      setInviteLink(link);
      queryClient.invalidateQueries({ queryKey: ["team-invites", teamId] });
      toast.success("Invite created", "Share the link with the coach or manager.");
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
      toast.success("Link copied", "Share it with the coach or manager.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy", "Please copy the link manually.");
    }
  };

  const handleClose = () => {
    setEmail("");
    setRole("assistant_coach");
    setError("");
    setInviteLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Coach or Manager</DialogTitle>
          <DialogDescription>
            Invite another adult to help manage {teamName}.
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-text-muted" />
                Email Address
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="coach@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={error ? "border-destructive" : ""}
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role" className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-text-muted" />
                Role
              </Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                This link expires in 14 days. Share it with the invited person.
              </p>
              <div className="flex items-center gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
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
