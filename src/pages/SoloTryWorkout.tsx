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
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const { data: invite, isLoading, error } = useQuery({
    queryKey: ['solo-invite', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solo_referral_invites')
        .select(`
          *,
          referrer:players!solo_referral_invites_referrer_player_id_fkey(
            first_name,
            last_initial
          ),
          workout:personal_practice_cards(
            id,
            title,
            date,
            tier,
            tasks:personal_practice_tasks(id, label, task_type)
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

      if (error) throw error;
      return data;
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
            Invite Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            This invite link doesn't exist or may have been removed.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            Go to Homepage
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
            {isRedeemed ? "Already Used" : "Link Expired"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isRedeemed 
              ? "This invite has already been used." 
              : "This invite link has expired."
            }
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  const referrerName = invite.referrer?.first_name || "A friend";
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
            <span className="text-sm font-medium">7 Days Free</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {referrerName} invited you!
          </h1>
          <p className="text-muted-foreground">
            Try this {isWorkout ? "workout" : "training program"} free for 7 days
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
                      {workout.title || "Training Workout"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {workout.tasks?.length || 0} tasks
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
                        +{workout.tasks.length - 3} more tasks
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
                      {plan.name || "Training Program"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {plan.days_per_week} days per week
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
                What you'll get:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Full access for 7 days
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Track your workouts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Earn badges as you train
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
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-12 mt-8">
        <div className="max-w-md mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}