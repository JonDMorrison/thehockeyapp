import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/app/Toast";
import { useTranslation } from "react-i18next";
import {
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";

interface PrivacySettings {
  user_id: string;
  lock_screen_show_player_name: boolean;
  lock_screen_show_team_name: boolean;
  allow_lock_screen_actions: boolean;
}

const WidgetSettings: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch privacy settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["user-privacy-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_privacy_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no settings exist
      if (!data) {
        return {
          user_id: user!.id,
          lock_screen_show_player_name: false,
          lock_screen_show_team_name: false,
          allow_lock_screen_actions: false,
        } as PrivacySettings;
      }

      return data as PrivacySettings;
    },
    enabled: !!user?.id,
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<PrivacySettings>) => {
      const { error } = await supabase
        .from("user_privacy_settings")
        .upsert({
          user_id: user!.id,
          ...settings,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-privacy-settings"] });
      toast.success(t("settings.widgetSettings.toast.saved"));
    },
    onError: () => {
      toast.error(t("settings.widgetSettings.toast.failedToSave"));
    },
  });

  const handleToggle = (key: keyof PrivacySettings, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  if (authLoading || isLoading) {
    return (
      <AppShell>
        <PageContainer>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell useNavHeader navTitle={t("settings.widgetSettings.title")}>
      <PageContainer>
        <div className="space-y-6">
          {/* Privacy warning */}
          <AppCard className="border-amber-500/20 bg-amber-500/5">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{t("settings.widgetSettings.privacyNotice")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.widgetSettings.privacyNoticeDesc")}
                </p>
              </div>
            </div>
          </AppCard>

          {/* Lock Screen Settings */}
          <AppCard>
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold">{t("settings.widgetSettings.lockScreenDisplay")}</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("settings.widgetSettings.lockScreenDisplayDesc")}
              </p>
            </div>

            <Separator className="my-4" />

            <div className="space-y-6">
              {/* Show player name */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="show-player-name" className="font-medium">
                    {t("settings.widgetSettings.showPlayerName")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.widgetSettings.showPlayerNameDesc")}
                  </p>
                </div>
                <Switch
                  id="show-player-name"
                  checked={settings?.lock_screen_show_player_name ?? false}
                  onCheckedChange={(checked) => handleToggle("lock_screen_show_player_name", checked)}
                />
              </div>

              {/* Show team name */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="show-team-name" className="font-medium">
                    {t("settings.widgetSettings.showTeamName")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.widgetSettings.showTeamNameDesc")}
                  </p>
                </div>
                <Switch
                  id="show-team-name"
                  checked={settings?.lock_screen_show_team_name ?? false}
                  onCheckedChange={(checked) => handleToggle("lock_screen_show_team_name", checked)}
                />
              </div>

              {/* Allow quick actions */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-actions" className="font-medium">
                    {t("settings.widgetSettings.allowLockScreenActions")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.widgetSettings.allowLockScreenActionsDesc")}
                  </p>
                </div>
                <Switch
                  id="allow-actions"
                  checked={settings?.allow_lock_screen_actions ?? false}
                  onCheckedChange={(checked) => handleToggle("allow_lock_screen_actions", checked)}
                />
              </div>
            </div>
          </AppCard>

          {/* Widget Setup Guide */}
          <AppCard>
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold">{t("settings.widgetSettings.addingWidgets")}</h2>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                <p className="font-medium">{t("settings.widgetSettings.ios")}</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>{t("settings.widgetSettings.iosStep1")}</li>
                  <li>{t("settings.widgetSettings.iosStep2")}</li>
                  <li>{t("settings.widgetSettings.iosStep3")}</li>
                  <li>{t("settings.widgetSettings.iosStep4")}</li>
                </ol>
              </div>

              <div className="space-y-2">
                <p className="font-medium">{t("settings.widgetSettings.android")}</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>{t("settings.widgetSettings.androidStep1")}</li>
                  <li>{t("settings.widgetSettings.androidStep2")}</li>
                  <li>{t("settings.widgetSettings.androidStep3")}</li>
                </ol>
              </div>

              <p className="text-muted-foreground italic pt-2">
                {t("settings.widgetSettings.widgetAvailability")}
              </p>
            </div>
          </AppCard>

          {/* Preview */}
          <AppCard>
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2">
                {settings?.lock_screen_show_player_name || settings?.lock_screen_show_team_name ? (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                )}
                <h2 className="font-semibold">{t("settings.widgetSettings.widgetPreview")}</h2>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Mock widget preview */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {t("settings.widgetSettings.today")}
                </span>
                {settings?.lock_screen_show_team_name && (
                  <span className="text-xs text-muted-foreground">Team Name</span>
                )}
              </div>

              {settings?.lock_screen_show_player_name && (
                <p className="font-medium">Player Name</p>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-primary rounded-full" />
                </div>
                <span className="text-sm font-medium">2/6</span>
              </div>

              {settings?.allow_lock_screen_actions && (
                <Button size="sm" variant="secondary" className="w-full mt-2">
                  {t("settings.widgetSettings.markNextDone")}
                </Button>
              )}
            </div>
          </AppCard>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default WidgetSettings;
