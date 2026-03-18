import React from "react";
import { Trophy, Star, Flame, Medal, Target, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

export const FeatureRewards: React.FC = () => {
  const { t } = useTranslation();

  const badges = [
    {
      icon: Flame,
      label: t('marketing.rewards_seven_day_streak'),
      earned: true,
      gradient: "from-orange-500 via-red-500 to-rose-600",
      glowColor: "shadow-orange-500/40"
    },
    {
      icon: Trophy,
      label: t('marketing.rewards_perfect_week'),
      earned: true,
      gradient: "from-amber-400 via-yellow-500 to-orange-500",
      glowColor: "shadow-amber-500/40"
    },
    {
      icon: Target,
      label: t('marketing.rewards_hundred_shots'),
      earned: true,
      gradient: "from-blue-500 via-cyan-400 to-teal-500",
      glowColor: "shadow-blue-500/40"
    },
    {
      icon: Medal,
      label: t('marketing.rewards_first_month'),
      earned: false,
      gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
      glowColor: "shadow-purple-500/40"
    },
  ];

  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold text-foreground">{t('marketing.rewards_badges_rewards')}</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* New badge celebration */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 rounded-xl p-4 text-white overflow-hidden shadow-lg shadow-amber-500/30"
        >
          {/* Sparkle decorations */}
          <div className="absolute top-2 right-3">
            <Star className="w-4 h-4 fill-white/50 animate-pulse" />
          </div>
          <div className="absolute bottom-3 left-4">
            <Star className="w-3 h-3 fill-white/30 animate-pulse" style={{ animationDelay: '150ms' }} />
          </div>

          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30 shadow-lg"
            >
              <Trophy className="w-7 h-7" />
            </motion.div>
            <div>
              <p className="text-xs text-white/80">{t('marketing.rewards_new_badge')}</p>
              <p className="text-lg font-bold">{t('marketing.rewards_perfect_week')}</p>
              <p className="text-[10px] text-white/80">{t('marketing.rewards_perfect_week_detail')}</p>
            </div>
          </div>
        </motion.div>

        {/* Badge grid */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('marketing.rewards_badges_heading')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge, index) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-xl border ${
                  badge.earned
                    ? "border-border bg-card hover:shadow-md transition-shadow"
                    : "border-dashed border-muted-foreground/30 opacity-50"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  badge.earned
                    ? `bg-gradient-to-br ${badge.gradient} shadow-lg ${badge.glowColor} ring-2 ring-white/20`
                    : "bg-muted"
                }`}>
                  <badge.icon className={`w-5 h-5 ${badge.earned ? "text-white" : "text-muted-foreground"}`} />
                </div>
                <p className="text-xs font-medium">{badge.label}</p>
                {!badge.earned && (
                  <p className="text-[9px] text-muted-foreground">{t('marketing.rewards_keep_going')}</p>
                )}
                {badge.earned && (
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3 text-primary" />
                    <span className="text-[9px] text-primary font-medium">{t('marketing.rewards_earned')}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Streak */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-orange-500/15 to-amber-500/10 rounded-xl p-4 border border-orange-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground">{t('marketing.rewards_seven_day_streak_badge')}</span>
            </div>
            <span className="text-2xl">🔥</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
