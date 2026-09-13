import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, Network, Plus, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const roleLabel: Record<string, string> = {
  owner: "Owner",
  director: "Director",
  admin: "Administrator",
  viewer: "Reporting access",
};

export default function Associations() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/auth", { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["associations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("association_roles")
        .select("role, associations(id, name, season_label, region, status)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <AppShell>
        <PageContainer className="max-w-5xl mx-auto">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </PageContainer>
      </AppShell>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AppShell
      header={
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <PageHeader title="Association HQ" subtitle="One operating view across every team" />
          <Button variant="team" size="sm" onClick={() => navigate("/associations/new")}>
            <Plus className="w-4 h-4" />
            New
          </Button>
        </div>
      }
    >
      <PageContainer className="max-w-5xl mx-auto">
        <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/10 p-6 sm:p-8">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              <Network className="h-3.5 w-3.5" />
              Association operations
            </div>
            <h2 className="text-3xl font-black uppercase leading-none tracking-[-0.035em] sm:text-4xl">
              Develop every team with one standard.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Give team staff their own workspace while directors track rollout, weekly plans, and family adoption through privacy-safe totals.
            </p>
          </div>
          <div className="relative mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {[
              [ShieldCheck, "Scoped access"],
              [Users, "Team autonomy"],
              [Building2, "Association view"],
            ].map(([Icon, label]) => (
              <div key={label as string} className="bg-background/80 px-3 py-4 text-center">
                <Icon className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-foreground sm:text-xs">{label as string}</p>
              </div>
            ))}
          </div>
        </section>

        {memberships && memberships.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {memberships.map((membership) => {
              const association = membership.associations;
              if (!association) return null;
              return (
                <AppCard
                  key={association.id}
                  className="group cursor-pointer overflow-hidden border-border/90 p-0 transition hover:-translate-y-0.5 hover:border-primary/40"
                  onClick={() => navigate(`/associations/${association.id}`)}
                >
                  <div className="h-1 bg-gradient-to-r from-primary to-brand-strong" />
                  <div className="flex items-center gap-4 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-black uppercase tracking-tight">{association.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[association.season_label, association.region, roleLabel[membership.role] || membership.role]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </AppCard>
              );
            })}
          </div>
        ) : (
          <AppCard className="border-dashed py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-black uppercase">Create your association workspace</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Start with one pilot team, then connect the rest as coaches come onboard.
            </p>
            <Button className="mt-5" variant="team" onClick={() => navigate("/associations/new")}>
              <Plus className="h-4 w-4" />
              Create association
            </Button>
          </AppCard>
        )}
      </PageContainer>
    </AppShell>
  );
}
