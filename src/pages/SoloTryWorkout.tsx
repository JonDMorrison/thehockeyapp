import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Gift, Calendar, Dumbbell, CheckCircle2, ArrowRight,
  Clock, Target, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function SoloTryWorkout() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const { data: invite, isLoading, error } = useQuery({
    queryKey: ['solo-invite', token],
    queryFn: async () => {
      const { data: invite, error: inviteError } = await supabase
        .from('solo_referral_invites')
        .select(`
          *,
          referrer:players!solo_referral_invites_referrer_player_id_fkey(
            first_name,
            last_initial
          ),
          plan:personal_training_plans(
            id,
            name,
            tier,
            days_per_week,
            training_focus
          )
        `)
        .eq('token', token!)
        .single();

      if (inviteError) throw inviteError;

      // Fetch workout card separately (no FK relationship)
      let workout: { id: string; title: string | null; date: string; tier: string | null; tasks: { id: string; label: string; task_type: string }[] } | null = null;
      if (invite.workout_card_id) {
        const { data: card } = await supabase
          .from('personal_practice_cards')
          .select('id, title, date, tier')
          .eq('id', invite.workout_card_id)
          .maybeSingle();
        if (card) {
          const { data: tasks } = await supabase
            .from('personal_practice_tasks')
            .select('id, label, task_type')
            .eq('personal_practice_card_id', card.id)
            .order('sort_order');
          workout = { ...card, tasks: tasks || [] };
        }
      }

      return { ...invite, workout };
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Check if invite is valid
  const isExpired = invite && new Date(invite.expires_at) < new Date();
  const isRedeemed = invite?.status === 'redeemed';
  const isValid = invite && !isExpired && !isRedeemed;

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {t('solo.inviteNotFound')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('solo.inviteNotFoundDesc')}
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            {t('solo.goToHomepage')}
          </Button>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {isRedeemed ? t('solo.alreadyUsed') : t('solo.linkExpired')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isRedeemed
              ? t('solo.alreadyUsedDesc')
              : t('solo.linkExpiredDesc')
            }
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            {t('solo.goToHomepage')}
          </Button>
        </div>
      </div>
    );
  }

  const referrerName = invite.referrer?.first_name || t('solo.aFriend');
  const isWorkout = invite.share_type === 'workout';
  const workout = invite.workout;
  const plan = invite.plan;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background px-6 pt-12 pb-8">
        <div className="max-w-md mx-auto text-center">
          {/* Gift Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Gift className="h-4 w-4" />
            <span className="text-sm font-medium">{t('solo.sevenDaysFree')}</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('solo.referrerInvitedYou', { name: referrerName })}
          </h1>
          <p className="text-muted-foreground">
            {t('solo.tryFreeForSevenDays', { type: isWorkout ? t('solo.workout') : t('solo.trainingProgram') })}
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="px-6 -mt-4">
        <div className="max-w-md mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {isWorkout && workout ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Dumbbell className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">
                      {workout.title || t('solo.trainingWorkout')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t('solo.nTasks', { n: workout.tasks?.length || 0 })}
                    </p>
                  </div>
                </div>

                {/* Task Preview */}
                {workout.tasks && workout.tasks.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {workout.tasks.slice(0, 3).map((task: { id: string; label: string; task_type: string }) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary/50" />
                        <span>{task.label}</span>
                      </div>
                    ))}
                    {workout.tasks.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-6">
                        {t('solo.nMoreTasks', { n: workout.tasks.length - 3 })}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : plan ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">
                      {plan.name || t('solo.trainingProgram')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t('solo.nDaysPerWeek', { n: plan.days_per_week })}
                    </p>
                  </div>
                </div>

                {/* Focus Areas */}
                {plan.training_focus && plan.training_focus.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {plan.training_focus.map((focus: string) => (
                      <span
                        key={focus}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      >
                        <Target className="h-3 w-3" />
                        {focus}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : null}

            {/* What You Get */}
            <div className="border-t border-border pt-4 mt-4">
              <p className="text-sm font-medium text-foreground mb-3">
                {t('solo.whatYoullGet')}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t('solo.fullAccessForSevenDays')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t('solo.trackYourWorkouts')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t('solo.earnBadgesAsYouTrain')}
                </li>
              </ul>
            </div>
          </div>

          {/* CTA Button */}
          <div className="mt-6 space-y-3">
            <Button
              onClick={() => navigate('/auth', { state: { returnTo: `/solo/try/${token}/claim` } })}
              size="lg"
              className="w-full"
            >
              {t('solo.getStartedFree')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t('solo.alreadyHaveAccount')}{" "}
              <Link to="/auth" className="text-primary font-medium">
                {t('solo.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-12 mt-8">
        <div className="max-w-md mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            {t('solo.noCreditCardRequired')}
          </p>
        </div>
      </div>
    </div>
  );
}
