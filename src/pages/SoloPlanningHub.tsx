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
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
  badgeVariant?: 'default' | 'premium';
  delay?: number;
  gradient: string;
  iconBg: string;
}

const PlanningCard = ({ 
  title, 
  subtitle, 
  description,
  icon, 
  onClick, 
  badge,
  badgeVariant = 'default',
  delay = 0,
  gradient,
  iconBg
}: PlanningCardProps) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    transition={{ delay, duration: 0.3 }}
    onClick={onClick}
    className={cn(
      "relative overflow-hidden rounded-2xl p-5 text-left flex flex-col justify-between",
      "min-h-[160px] shadow-sm hover:shadow-lg transition-all duration-300",
      gradient
    )}
  >
    {/* Decorative background elements */}
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
    <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-white/5 translate-y-6 -translate-x-6" />
    
    {/* Badge */}
    {badge && (
      <div className="absolute top-3 right-3">
        <span className={cn(
          "text-[10px] font-bold px-2 py-1 rounded-full",
          badgeVariant === 'premium' 
            ? "bg-white/20 text-white backdrop-blur-sm border border-white/30"
            : "bg-white/90 text-foreground"
        )}>
          {badge}
        </span>
      </div>
    )}

    {/* Icon */}
    <div className={cn(
      "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
      iconBg
    )}>
      {icon}
    </div>

    {/* Content */}
    <div className="relative z-10">
      <h3 className="font-bold text-white text-lg mb-0.5">{title}</h3>
      <p className="text-white/90 font-medium text-sm">{subtitle}</p>
      <p className="text-white/70 text-xs mt-2 leading-relaxed">{description}</p>
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
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              What would you like to create?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <PlanningCard
                title="Workout"
                subtitle="Single Day"
                description="Build a focused session for today or pick any date"
                icon={<CalendarPlus className="w-6 h-6 text-white" />}
                badge={recentWorkouts && recentWorkouts > 0 ? `${recentWorkouts} today` : undefined}
                onClick={() => navigate(`/solo/workout/${playerId}`)}
                delay={0}
                gradient="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700"
                iconBg="bg-white/20 backdrop-blur-sm"
              />

              <PlanningCard
                title="Weekly"
                subtitle="7-Day Routine"
                description="Plan Mon–Sun and repeat every week automatically"
                icon={<CalendarRange className="w-6 h-6 text-white" />}
                onClick={() => navigate(`/solo/week-planner/${playerId}`)}
                delay={0.1}
                gradient="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700"
                iconBg="bg-white/20 backdrop-blur-sm"
              />

              <PlanningCard
                title="Program"
                subtitle="Multi-Week Plan"
                description="AI builds 2–8 weeks of progressive training for you"
                icon={<Sparkles className="w-6 h-6 text-white" />}
                badge="✨ AI"
                badgeVariant="premium"
                onClick={() => navigate(`/solo/program/${playerId}`)}
                delay={0.2}
                gradient="bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500"
                iconBg="bg-white/20 backdrop-blur-sm"
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
