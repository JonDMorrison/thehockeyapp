import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarPlus, CalendarRange, Sparkles, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanningHubCardsProps {
  teamId: string;
  onAddWorkout: () => void;
  onPlanWeek: () => void;
  onCreateProgram: () => void;
  weekPlanCount?: number;
}

interface PlanningCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  badge?: string;
  badgeVariant?: "default" | "premium";
  onClick: () => void;
  delay?: number;
}

const PlanningCard: React.FC<PlanningCardProps> = ({
  title,
  subtitle,
  icon,
  gradient,
  badge,
  badgeVariant = "default",
  onClick,
  delay = 0,
}) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative w-full p-5 rounded-2xl text-left overflow-hidden",
        "bg-gradient-to-br shadow-lg",
        "border border-white/10",
        "transition-shadow duration-300 hover:shadow-xl",
        gradient
      )}
    >
      {/* Shimmer effect for premium badge */}
      {badgeVariant === "premium" && (
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute -inset-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
          />
        </div>
      )}
      
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
            {icon}
          </div>
          {badge && (
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold",
                badgeVariant === "premium"
                  ? "bg-white/25 text-white backdrop-blur-sm"
                  : "bg-white/20 text-white/90"
              )}
            >
              {badge}
            </span>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-white/80 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </motion.button>
  );
};

export const PlanningHubCards: React.FC<PlanningHubCardsProps> = ({
  teamId,
  onAddWorkout,
  onPlanWeek,
  onCreateProgram,
  weekPlanCount = 0,
}) => {
  return (
    <div className="space-y-3">
      {/* Add Workout - Full width */}
      <PlanningCard
        title="Add Workout"
        subtitle="One workout for one day—perfect for today or any date"
        icon={<CalendarPlus className="w-6 h-6 text-white" />}
        gradient="from-emerald-500 to-teal-500"
        badge={weekPlanCount > 0 ? `${weekPlanCount} this week` : undefined}
        onClick={onAddWorkout}
        delay={0}
      />
      
      {/* Two cards side by side */}
      <div className="grid grid-cols-2 gap-3">
        <PlanningCard
          title="Plan the Week"
          subtitle="Set up Mon–Sun, reuse it every week"
          icon={<CalendarRange className="w-6 h-6 text-white" />}
          gradient="from-blue-500 to-indigo-500"
          onClick={onPlanWeek}
          delay={0.1}
        />
        
        <PlanningCard
          title="Create a Program"
          subtitle="AI builds 4–8 weeks of training for you"
          icon={
            <div className="flex items-center gap-0.5">
              <Sparkles className="w-5 h-5 text-white" />
              <Rocket className="w-4 h-4 text-white/80" />
            </div>
          }
          gradient="from-purple-500 to-pink-500"
          badge="AI"
          badgeVariant="premium"
          onClick={onCreateProgram}
          delay={0.2}
        />
      </div>
    </div>
  );
};
