import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/app/Toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Crown, Loader2, Copy, X, ChevronLeft, Clock, Users, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CompAdmin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Check admin status
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["am-i-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("am_i_admin");
      if (error) return false;
      return data as boolean;
    },
    enabled: !!user,
  });

  // Fetch comp stats
  const { data: stats } = useQuery({
    queryKey: ["comp-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_comp_stats");
      if (error) throw error;
      return data?.[0] as { active_comp_count: number; grants_last_7d: number; pending_count: number } | undefined;
    },
    enabled: !!isAdmin,
  });

  // Fetch comp list
  const { data: compList, isLoading: listLoading } = useQuery({
    queryKey: ["comp-admin-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_comp_admin_list", { p_limit: 100, p_offset: 0 });
      if (error) throw error;
      return data as Array<{
        user_id: string;
        email: string;
        display_name: string | null;
        plan: string;
        status: string;
        source: string;
        comp_reason: string | null;
        comp_tag: string | null;
        comp_granted_at: string | null;
        current_period_end: string | null;
        revoked_at: string | null;
      }>;
    },
    enabled: !!isAdmin,
  });

  // Fetch pending grants
  const { data: pendingList } = useQuery({
    queryKey: ["pending-comp-grants"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pending_comp_grants");
      if (error) throw error;
      return data as Array<{ id: string; email: string; reason: string; tag: string; days: number; created_at: string }>;
    },
    enabled: !!isAdmin,
  });

  // Grant form state
  const [grantEmail, setGrantEmail] = useState("");
  const [grantReason, setGrantReason] = useState<string>("");
  const [grantTag, setGrantTag] = useState("");
  const [grantDays, setGrantDays] = useState(365);

  const grantMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("grant-comp", {
        body: { email: grantEmail, reason: grantReason, tag: grantTag, days: grantDays },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const mode = data.mode === "pending" ? t("admin.comp.grantModePending") : t("admin.comp.grantModeActivated");
      toast.success(t("admin.comp.toast.compGranted", { mode }), `${t("admin.comp.toast.expires")}: ${new Date(data.expires_at).toLocaleDateString()}`);
      setGrantEmail("");
      setGrantTag("");
      setGrantReason("");
      setGrantDays(365);
      queryClient.invalidateQueries({ queryKey: ["comp-admin-list"] });
      queryClient.invalidateQueries({ queryKey: ["comp-stats"] });
      queryClient.invalidateQueries({ queryKey: ["pending-comp-grants"] });
    },
    onError: (err: Error) => {
      toast.error(t("admin.comp.toast.grantFailed"), err.message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("revoke-comp", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success(t("admin.comp.toast.revoked"));
      queryClient.invalidateQueries({ queryKey: ["comp-admin-list"] });
      queryClient.invalidateQueries({ queryKey: ["comp-stats"] });
    },
    onError: (err: Error) => {
      toast.error(t("admin.comp.toast.revokeFailed"), err.message);
    },
  });

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{t("admin.comp.notAuthorized")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.comp.noAccess")}</p>
        <Button variant="outline" onClick={() => navigate("/")}>{t("common.goHome")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">{t("admin.comp.title")}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Caps Status */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label={t("admin.comp.activeComps")}
            value={`${stats?.active_comp_count ?? 0} / 200`}
          />
          <StatCard
            icon={<Zap className="w-4 h-4" />}
            label={t("admin.comp.grants7d")}
            value={`${stats?.grants_last_7d ?? 0} / 20`}
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label={t("admin.comp.pending")}
            value={`${stats?.pending_count ?? 0}`}
          />
        </div>

        {/* Grant Form */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            {t("admin.comp.grantComplimentaryPro")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="comp-email">{t("common.email")}</Label>
              <Input
                id="comp-email"
                type="email"
                placeholder="friend@example.com"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.comp.reason")}</Label>
              <Select value={grantReason} onValueChange={setGrantReason}>
                <SelectTrigger><SelectValue placeholder={t("admin.comp.selectReason")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friend">{t("admin.comp.reasonFriend")}</SelectItem>
                  <SelectItem value="influencer">{t("admin.comp.reasonInfluencer")}</SelectItem>
                  <SelectItem value="partner">{t("admin.comp.reasonPartner")}</SelectItem>
                  <SelectItem value="internal">{t("admin.comp.reasonInternal")}</SelectItem>
                  <SelectItem value="other">{t("admin.comp.reasonOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-tag">{t("admin.comp.tag")}</Label>
              <Input
                id="comp-tag"
                placeholder="e.g. @hockeyinfluencer"
                value={grantTag}
                onChange={(e) => setGrantTag(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.comp.duration")}</Label>
              <div className="flex gap-2">
                {[30, 90, 365].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant={grantDays === d ? "default" : "outline"}
                    onClick={() => setGrantDays(d)}
                  >
                    {d}d
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={() => grantMutation.mutate()}
            disabled={!grantEmail || !grantReason || !grantTag || grantMutation.isPending}
            className="w-full sm:w-auto"
          >
            {grantMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
            {t("admin.comp.grantAccess")}
          </Button>
        </section>

        {/* Pending Grants */}
        {(pendingList?.length ?? 0) > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{t("admin.comp.pendingGrants")}</h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.email")}</TableHead>
                    <TableHead>{t("admin.comp.reason")}</TableHead>
                    <TableHead>{t("admin.comp.tag")}</TableHead>
                    <TableHead>{t("admin.comp.days")}</TableHead>
                    <TableHead>{t("admin.comp.created")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingList?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.email}</TableCell>
                      <TableCell><Badge variant="secondary">{p.reason}</Badge></TableCell>
                      <TableCell className="text-xs">{p.tag}</TableCell>
                      <TableCell>{p.days}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {/* Active Comped Users Table */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("admin.comp.compedUsers")}</h2>
          {listLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.email")}</TableHead>
                    <TableHead>{t("admin.comp.expires")}</TableHead>
                    <TableHead>{t("admin.comp.reason")}</TableHead>
                    <TableHead>{t("admin.comp.tag")}</TableHead>
                    <TableHead>{t("admin.comp.status")}</TableHead>
                    <TableHead>{t("admin.comp.granted")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compList?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {t("admin.comp.noCompGrants")}
                      </TableCell>
                    </TableRow>
                  )}
                  {compList?.map((c) => (
                    <TableRow key={c.user_id}>
                      <TableCell className="font-mono text-xs">{c.email ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {c.current_period_end
                          ? new Date(c.current_period_end).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{c.comp_reason ?? "—"}</Badge></TableCell>
                      <TableCell className="text-xs">{c.comp_tag ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "comped" ? "default" : "destructive"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.comp_granted_at
                          ? new Date(c.comp_granted_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.email && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(c.email);
                                toast.success(t("admin.comp.toast.emailCopied"));
                              }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {c.status === "comped" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => revokeMutation.mutate(c.user_id)}
                              disabled={revokeMutation.isPending}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
