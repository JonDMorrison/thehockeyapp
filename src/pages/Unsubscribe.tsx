import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BellOff, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const allowedKinds = new Set([
  "weekly_coach_digest",
  "player_weekly_progress",
  "product_updates",
  "all_optional",
]);

export default function Unsubscribe() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const requestedKind = searchParams.get("kind") || "all_optional";
  const kind = allowedKinds.has(requestedKind) ? requestedKind : "all_optional";
  const [status, setStatus] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    let active = true;
    const unsubscribe = async () => {
      if (!token) {
        setStatus("error");
        return;
      }
      const { data, error } = await supabase.rpc("unsubscribe_email", {
        p_token: token,
        p_kind: kind,
      });
      if (active) setStatus(!error && data === true ? "done" : "error");
    };
    unsubscribe();
    return () => { active = false; };
  }, [kind, token]);

  const label = kind === "weekly_coach_digest"
    ? "weekly coach digest"
    : kind === "player_weekly_progress"
      ? "player weekly progress email"
      : kind === "product_updates"
        ? "product update"
        : "optional email";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-7 text-center shadow-2xl sm:p-9">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          {status === "working" ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : status === "done" ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          ) : (
            <BellOff className="h-8 w-8 text-amber-400" />
          )}
        </div>

        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Email preferences</p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tight">
          {status === "working" ? "Updating" : status === "done" ? "You're unsubscribed" : "Link unavailable"}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          {status === "working"
            ? "Saving your preference now."
            : status === "done"
              ? `You will no longer receive the ${label}. Required account and security messages may still be sent.`
              : "This unsubscribe link is invalid or no longer available. You can still change email preferences in your account settings."}
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Your choice is saved immediately.
        </div>

        <Button className="mt-7 w-full" asChild>
          <Link to="/settings">Open account settings</Link>
        </Button>
        <Button className="mt-2 w-full" variant="ghost" asChild>
          <Link to="/">Back to The Hockey App</Link>
        </Button>
      </section>
    </main>
  );
}
