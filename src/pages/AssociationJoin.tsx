import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/app/Toast";

interface InvitePreview {
  success?: boolean;
  error?: string;
  association_name?: string;
  season_label?: string | null;
  region?: string | null;
  role?: string;
  expires_at?: string;
}
interface RedeemResult {
  success?: boolean;
  error?: string;
  association_id?: string;
}

export default function AssociationJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const previewQuery = useQuery({
    queryKey: ["association-invite-preview", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("preview_association_invite", { p_token: token! });
      if (error) throw error;
      return data as unknown as InvitePreview;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated && token) {
      sessionStorage.setItem("pendingAssociationInvite", token);
    }
  }, [authLoading, isAuthenticated, token]);

  const redeem = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("redeem_association_invite", { p_token: token! });
      if (error) throw error;
      const result = data as unknown as RedeemResult;
      if (!result.success || !result.association_id) throw new Error(result.error || "Could not accept invitation");
      return result.association_id;
    },
    onSuccess: (associationId) => {
      sessionStorage.removeItem("pendingAssociationInvite");
      toast.success("Association access accepted", "Welcome to the association workspace.");
      navigate(`/associations/${associationId}`, { replace: true });
    },
    onError: (error: Error) => toast.error("Could not accept invitation", error.message),
  });

  if (previewQuery.isLoading || authLoading) {
    return <AppShell hideNav><PageContainer className="mx-auto max-w-lg"><Skeleton className="h-80 rounded-2xl" /></PageContainer></AppShell>;
  }

  const preview = previewQuery.data;
  if (previewQuery.error || !preview?.success) {
    return (
      <AppShell hideNav>
        <PageContainer className="mx-auto max-w-lg pt-16 text-center">
          <AppCard>
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-4 text-xl font-black uppercase">Invitation unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{preview?.error || "This invitation is invalid or has expired."}</p>
            <Button className="mt-5" onClick={() => navigate("/")}>Go home</Button>
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav>
      <PageContainer className="mx-auto max-w-lg pt-10 sm:pt-20">
        <AppCard className="overflow-hidden border-primary/30" contentClassName="p-0">
          <div className="h-1.5 bg-gradient-to-r from-primary to-cyan-400" />
          <div className="p-6 text-center sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">Association invitation</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">{preview.association_name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {[preview.season_label, preview.region].filter(Boolean).join(" · ")}
            </p>
            <div className="mx-auto mt-6 flex max-w-sm items-start gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-left">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
              <p className="text-sm leading-5 text-muted-foreground">
                You are being offered <span className="font-semibold capitalize text-foreground">{preview.role}</span> access to association-level reporting. This does not automatically grant access to individual player records.
              </p>
            </div>

            {isAuthenticated ? (
              <Button className="mt-6 w-full" variant="team" size="lg" disabled={redeem.isPending} onClick={() => redeem.mutate()}>
                {redeem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                Accept association access
              </Button>
            ) : (
              <Button className="mt-6 w-full" variant="team" size="lg" onClick={() => navigate(`/auth?redirect=${encodeURIComponent(`/association/join/${token}`)}`)}>
                Sign in to accept
              </Button>
            )}
          </div>
        </AppCard>
      </PageContainer>
    </AppShell>
  );
}
