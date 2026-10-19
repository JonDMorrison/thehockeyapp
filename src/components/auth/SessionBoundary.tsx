import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearSignedMediaCache } from "@/lib/media";
import { clearToasts } from "@/hooks/use-toast";
import { setOfflineAccountOwner } from "@/lib/offlineStorage";
import { startSyncInterval, stopSyncInterval } from "@/lib/syncEngine";
import { useActiveView } from "@/contexts/ActiveViewContext";

/** End the previous account's UI lifetime before rendering another family's workspace. */
export function SessionBoundary({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const authFlow = useLocation().pathname === "/auth";
  const { resetActiveView } = useActiveView();
  const currentOwner = useRef<string | null | undefined>(undefined);
  const [owner, setOwner] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    let authEventObserved = false;
    const acceptOwner = (next: string | null) => {
      if (!active || currentOwner.current === next) return;
      const previous = currentOwner.current;
      currentOwner.current = next;
      setOfflineAccountOwner(next);
      const storedOwner = localStorage.getItem("hockey-app-session-owner");
      if (previous !== undefined || storedOwner !== next) {
        void queryClient.cancelQueries();
        queryClient.clear();
        clearSignedMediaCache();
        clearToasts();
        toast.dismiss();
        resetActiveView();
      }
      if (next) localStorage.setItem("hockey-app-session-owner", next);
      else localStorage.removeItem("hockey-app-session-owner");
      setOwner(next);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventObserved = true;
      acceptOwner(session?.user.id ?? null);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!authEventObserved) acceptOwner(data.session?.user.id ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [queryClient, resetActiveView]);
  useEffect(() => {
    if (!owner) return;
    startSyncInterval();
    return () => stopSyncInterval();
  }, [owner]);
  if (owner === undefined && !authFlow) return <div role="status" className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading your workspace…</div>;
  return <Fragment key={authFlow ? "auth-flow" : owner ?? "signed-out"}>{children}</Fragment>;
}
