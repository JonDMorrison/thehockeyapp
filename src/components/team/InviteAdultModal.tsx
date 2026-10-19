import { useNavigate } from "react-router-dom";
import React, { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Copy,
  Check,
  Mail,
  Link as LinkIcon,
  Users,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
}
interface StaffInvite {
  id: string;
  token: string;
  expires_at: string;
  invitation_kind: "email" | "link";
}
export function InviteAdultModal({
  open,
  onOpenChange,
  teamId,
  teamName,
}: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [method, setMethod] = useState<"email" | "link">("email"),
    [email, setEmail] = useState(""),
    [invite, setInvite] = useState<StaffInvite | null>(null),
    [sent, setSent] = useState(false),
    [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const address = useRef("");
  const link = invite
    ? `${window.location.origin}/team/adult/join/${invite.token}`
    : "";
  const create = useMutation({
    mutationFn: async () => {
      setError("");
      const recipient =
        method === "email"
          ? z
              .string()
              .trim()
              .email("Enter a valid email address")
              .parse(email)
              .toLowerCase()
          : undefined;
      address.current = recipient ?? "";
      const { data, error } = await supabase.rpc("create_team_staff_invite", {
        p_id: requestId.current,
        p_team_id: teamId,
        ...(recipient ? { p_email: recipient } : {}),
      });
      if (error) throw error;
      const saved = data as unknown as StaffInvite;
      if (!saved?.token || !saved.id)
        throw new Error("The invitation could not be created. Please retry.");
      setInvite(saved);
      await queryClient.invalidateQueries({
        queryKey: ["team-invites", teamId],
      });
      return saved;
    },
    onError: (e) =>
      setError(
        e instanceof z.ZodError
          ? e.issues[0].message
          : e instanceof Error
            ? e.message
            : ((e as { message?: string }).message ??
              "Could not create invitation. Please retry."),
      ),
  });
  const delivery = useMutation({
    mutationFn: async (saved: StaffInvite) => {
      setError("");
      const { data, error } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            type: "staff_invitation",
            to: address.current,
            data: { teamId, inviteId: saved.id },
          },
        },
      );
      if (error) {
        let message =
          "The invitation is ready, but the email did not send. Retry or copy the link below.";
        try {
          const body = await error.context?.json();
          if (body?.error) message = body.error;
        } catch {
          /* Use the readable fallback. */
        }
        throw new Error(message);
      }
      if (!data?.success)
        throw new Error(
          data?.error ??
            "The email did not send. Retry or copy the link below.",
        );
      setSent(true);
    },
    onError: (e) => setError(e.message),
  });
  const busy = create.isPending || delivery.isPending;
  const reset = () => {
    setInvite(null);
    setSent(false);
    setCopied(false);
    setError("");
    requestId.current = crypto.randomUUID();
    create.reset();
    delivery.reset();
  };
  const close = () => {
    if (busy) return;
    reset();
    setEmail("");
    setMethod("email");
    onOpenChange(false);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await create.mutateAsync();
      if (method === "email") await delivery.mutateAsync(saved);
    } catch {
      /* Errors remain visible with a retry action. */
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError(
        "Copy was unavailable. Select the invitation link below to copy it.",
      );
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md [&>*]:min-w-0">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Invite team staff</DialogTitle>
          <DialogDescription className="[overflow-wrap:anywhere]">
            Bring a coach or manager into {teamName}’s coaching workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
          One shared dashboard for plans, roster, shooting challenges and
          progress. No separate manager setup.
        </div>
        {!invite ? (
          <form onSubmit={submit} className="space-y-4">
            <div
              className="grid grid-cols-2 gap-2"
              role="group"
              aria-label="Invitation method"
            >
              {(
                [
                  { value: "email", label: "Email invitation", Icon: Mail },
                  { value: "link", label: "Share a link", Icon: LinkIcon },
                ] as const
              ).map(({ value, label, Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={method === value ? "secondary" : "outline"}
                  aria-pressed={method === value}
                  disabled={busy}
                  onClick={() => {
                    setMethod(value);
                    requestId.current = crypto.randomUUID();
                    setError("");
                  }}
                  className="min-h-12 px-2 text-xs sm:text-sm"
                >
                  <Icon className="mr-1.5 h-4 w-4 shrink-0" />
                  {label}
                </Button>
              ))}
            </div>
            {method === "email" ? (
              <div className="space-y-2">
                <Label htmlFor="staff-email">Their email address</Label>
                <Input
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  placeholder="coach@example.com"
                  value={email}
                  disabled={busy}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    requestId.current = crypto.randomUUID();
                  }}
                  required
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  We’ll email their invitation. They join using this email
                  address.
                </p>
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Create a private link for one coach or manager. They can sign up
                or use an existing account. Each link can be used once and
                expires in 14 days.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="min-h-12 w-full" disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : method === "email" ? (
                <Mail className="mr-2 h-4 w-4" />
              ) : (
                <LinkIcon className="mr-2 h-4 w-4" />
              )}
              {busy
                ? "Preparing invitation…"
                : method === "email"
                  ? "Send invitation"
                  : "Create staff link"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-xl border border-success/20 bg-success/5 p-4"
            >
              <p className="flex items-center gap-2 font-semibold">
                <Check className="h-4 w-4 text-success" />
                {sent
                  ? "Invitation emailed"
                  : method === "link"
                    ? "Your staff link is ready"
                    : delivery.isPending
                      ? "Sending invitation…"
                      : "Invitation ready"}
              </p>
              <p className="mt-2 break-words text-sm text-muted-foreground">
                {method === "email"
                  ? `${address.current} must use this email address to join.`
                  : "Share privately with one coach or manager. They’ll join the same coaching dashboard."}
              </p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {method === "email" && !sent && (
              <Button
                variant="outline"
                className="min-h-11 w-full"
                disabled={busy}
                onClick={() => delivery.mutate(invite)}
              >
                {delivery.isPending ? "Sending…" : "Retry email"}
              </Button>
            )}
            <div className="space-y-2">
              <Label htmlFor="staff-link">Staff invitation link</Label>
              <Input
                id="staff-link"
                value={link}
                readOnly
                onFocus={(e) => e.target.select()}
                className="text-xs"
              />
              <p className="text-xs text-muted-foreground">
                One person · expires{" "}
                {new Date(invite.expires_at).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="outline"
              className="min-h-11 w-full"
              onClick={copy}
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy staff link"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="min-h-11 flex-1"
                disabled={busy}
                onClick={reset}
              >
                Invite another person
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button className="min-h-11" disabled={busy} onClick={close}>
                Done
              </Button>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          disabled={busy}
          className="min-h-11 w-full text-muted-foreground"
          onClick={() => {
            close();
            navigate(`/teams/${teamId}/settings#team-staff`);
          }}
        >
          Manage staff and invitations
        </Button>
      </DialogContent>
    </Dialog>
  );
}
