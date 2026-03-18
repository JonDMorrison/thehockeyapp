import { useTranslation } from 'react-i18next';
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, User, Calendar, Bell, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { SoloScheduleSyncSection } from "@/components/player/SoloScheduleSyncSection";
import { SoloJoinTeamSection } from "@/components/player/SoloJoinTeamSection";
export default function SoloSettings() {
  const { t } = useTranslation();
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const { data: player, isLoading } = useQuery({
    queryKey: ['player', playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_initial, profile_photo_url')
        .eq('id', playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  const header = (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-background">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(`/solo/dashboard/${playerId}`)}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-lg font-semibold">{t('solo.settings')}</h1>
    </div>
  );

  if (isLoading || authLoading) {
    return (
      <AppShell header={header} hideNav>
        <div className="p-5 space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell header={header} hideNav>
      <div className="px-5 py-6 space-y-6">
        {/* Profile Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('solo.profile')}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              {player?.profile_photo_url ? (
                <img
                  src={player.profile_photo_url}
                  alt={player.first_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-lg font-semibold text-muted-foreground">
                    {player?.first_name?.[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">
                  {player?.first_name} {player?.last_initial}.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary"
                  onClick={() => navigate(`/players/${playerId}`)}
                >
                  {t('solo.editProfile')}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Join Team Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('solo.teams')}
          </h2>
          <SoloJoinTeamSection playerId={playerId!} variant="section" />
        </section>

        {/* Schedule Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('solo.scheduleSync')}
          </h2>
          <SoloScheduleSyncSection playerId={playerId!} />
        </section>

        {/* Placeholder for future settings */}
        <section className="opacity-50">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t('solo.notifications')}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{t('solo.comingSoon')}</p>
          </div>
        </section>

        <section className="opacity-50">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('solo.privacy')}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{t('solo.comingSoon')}</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
