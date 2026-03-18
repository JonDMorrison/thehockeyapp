import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useTranslation } from "react-i18next";
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

export const InviteAdultModal: React.FC<InviteAdultModalProps> = ({
  open,
  onOpenChange,
  teamId,
  teamName,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const roleOptions = [
    { value: "assistant_coach", label: t("teams.role.assistantCoach") },
    { value: "manager", label: t("teams.role.manager") },
  ];

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
      toast.success(t("teams.inviteAdult.toastCreatedTitle"), t("teams.inviteAdult.toastCreatedDescription"));
    },
    onError: (error: Error) => {
      toast.error(t("teams.inviteAdult.toastFailedTitle"), error.message);
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
      toast.success(t("teams.inviteAdult.toastLinkCopiedTitle"), t("teams.inviteAdult.toastLinkCopiedDescription"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("teams.inviteAdult.toastCopyFailedTitle"), t("teams.inviteAdult.toastCopyFailedDescription"));
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
          <DialogTitle>{t("teams.inviteAdult.title")}</DialogTitle>
          <DialogDescription>
            {t("teams.inviteAdult.description", { teamName })}
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-text-muted" />
                {t("teams.inviteAdult.emailLabel")}
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
                {t("teams.inviteAdult.roleLabel")}
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
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="team"
                disabled={createInvite.isPending}
              >
                {createInvite.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("teams.inviteAdult.createButton")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-success-muted border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-success" />
                <p className="text-sm font-medium text-success">{t("teams.inviteAdult.inviteCreated")}</p>
              </div>
              <p className="text-xs text-text-muted mb-3">
                {t("teams.inviteAdult.expiryNote")}
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEmail("");
                  setRole("assistant_coach");
                  setError("");
                  setInviteLink(null);
                  setCopied(false);
                }}
              >
                {t("teams.inviteAdult.inviteAnother")}
              </Button>
              <Button type="button" variant="team" onClick={handleClose}>
                {t("teams.inviteAdult.done")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
