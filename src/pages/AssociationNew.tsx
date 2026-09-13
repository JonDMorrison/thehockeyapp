import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronLeft, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/app/Toast";

type CreateAssociationResult = {
  success?: boolean;
  association_id?: string;
};

export default function AssociationNew() {
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("");
  const [region, setRegion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/auth", { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Association name required", "Enter the name used by your members and teams.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_association", {
        p_name: name.trim(),
        p_season_label: seasonLabel.trim() || undefined,
        p_region: region.trim() || undefined,
      });
      if (error) throw error;
      const result = data as CreateAssociationResult;
      if (!result.association_id) throw new Error("Association was not created");
      toast.success("Association workspace created", "Connect the pilot team next.");
      navigate(`/associations/${result.association_id}`, { replace: true });
    } catch (error) {
      toast.error("Could not create association", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell
      hideNav
      header={
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/associations")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <PageHeader title="Create association" subtitle="Set up the shared operating layer" />
        </div>
      }
    >
      <PageContainer className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card to-primary/10 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(223,47,54,0.22)]">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Association HQ</p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">One view. Independent teams.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Directors receive aggregate rollout and adoption reporting. Individual player records remain with authorized team staff and families.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AppCard>
            <AppCardTitle>Association details</AppCardTitle>
            <AppCardDescription className="mt-1">You can update these labels as the season changes.</AppCardDescription>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="association-name">Association name</Label>
                <Input
                  id="association-name"
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, 120))}
                  placeholder="North Shore Minor Hockey"
                  autoFocus
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="association-season">Season</Label>
                  <Input
                    id="association-season"
                    value={seasonLabel}
                    onChange={(event) => setSeasonLabel(event.target.value.slice(0, 50))}
                    placeholder="2026–27"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="association-region">Region</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="association-region"
                      className="pl-9"
                      value={region}
                      onChange={(event) => setRegion(event.target.value.slice(0, 100))}
                      placeholder="North Vancouver, BC"
                    />
                  </div>
                </div>
              </div>
            </div>
          </AppCard>

          <div className="flex items-start gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
            <p className="leading-6 text-muted-foreground">
              Creating this workspace makes you its owner. Adding a team also requires that team’s head-coach access.
            </p>
          </div>

          <Button type="submit" variant="team" size="xl" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create association workspace
          </Button>
        </form>
      </PageContainer>
    </AppShell>
  );
}
