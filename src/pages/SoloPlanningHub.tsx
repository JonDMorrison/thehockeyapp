import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  ChevronLeft, CalendarPlus, CalendarRange, Sparkles, Rocket,
  ChevronRight, Calendar, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PlanningCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
  badgeVariant?: 'default' | 'premium';
  delay?: number;
}

const PlanningCard = ({ 
  title, 
  subtitle, 
  icon, 
  onClick, 
  badge,
  badgeVariant = 'default',
  delay = 0 
}: PlanningCardProps) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    onClick={onClick}
    className="w-full bg-card border border-border rounded-2xl p-5 text-left hover:bg-muted/50 transition-colors active:scale-[0.98]"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {badge && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded",
              badgeVariant === 'premium' 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "bg-muted text-muted-foreground"
            )}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
    </div>
  </motion.button>
);

export default function SoloPlanningHub() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

  // Fetch player
  const { data: player, isLoading } = useQuery({
    queryKey: ['player', playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name')
        .eq('id', playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  // Fetch active training plan
  const { data: activePlan } = useQuery({
    queryKey: ['solo-active-plan', playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_training_plans')
        .select('*')
        .eq('player_id', playerId!)
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!playerId,
  });

  // Fetch recent workout count
  const { data: recentWorkouts } = useQuery({
    queryKey: ['solo-recent-workouts', playerId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('personal_practice_cards')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', playerId!)
        .gte('date', format(new Date(), 'yyyy-MM-dd'));
      if (error) throw error;
      return count || 0;
    },
    enabled: !!playerId,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-5 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate(`/solo/dashboard/${playerId}`)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Plan Training</h1>
              <p className="text-sm text-muted-foreground">
                Build your workouts
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 space-y-4 pb-8">
          {/* Current Status */}
          {activePlan && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {activePlan.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active plan · {activePlan.days_per_week} days/week
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
            </motion.div>
          )}

          {/* Planning Options */}
          <div className="pt-2">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              What would you like to create?
            </h2>

            <div className="space-y-3">
              <PlanningCard
                title="Today's Workout"
                subtitle="Build a single workout for today or any date"
                icon={<CalendarPlus className="w-6 h-6 text-primary" />}
                badge={recentWorkouts && recentWorkouts > 0 ? `${recentWorkouts} today` : undefined}
                onClick={() => navigate(`/solo/workout/${playerId}`)}
                delay={0}
              />

              <PlanningCard
                title="Weekly Routine"
                subtitle="Plan Monday through Sunday, reuse every week"
                icon={<CalendarRange className="w-6 h-6 text-primary" />}
                onClick={() => navigate(`/solo/week-planner/${playerId}`)}
                delay={0.1}
              />

              <PlanningCard
                title="Training Program"
                subtitle="AI builds 2-8 weeks of progressive training"
                icon={
                  <div className="flex items-center gap-0.5">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <Rocket className="w-4 h-4 text-primary/70" />
                  </div>
                }
                badge="AI"
                badgeVariant="premium"
                onClick={() => navigate(`/solo/program/${playerId}`)}
                delay={0.2}
              />
            </div>
          </div>

          {/* Explanation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="pt-4"
          >
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground">How it works</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="font-medium text-foreground">1.</span>
                  <span>Pick a workout type or let AI build your plan</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-medium text-foreground">2.</span>
                  <span>Complete daily tasks to build consistency</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-medium text-foreground">3.</span>
                  <span>Earn badges as you hit milestones</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
