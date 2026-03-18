import React from "react";
import { Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { useTranslation } from 'react-i18next';

const players = [
  { name: "Alex", initial: "A", completed: true, time: "2:30 PM" },
  { name: "Jordan", initial: "J", completed: true, time: "3:15 PM" },
  { name: "Sam", initial: "S", completed: true, time: "4:00 PM" },
  { name: "Riley", initial: "R", completed: false },
  { name: "Casey", initial: "C", completed: false },
];

export const FeatureCoachView: React.FC = () => {
  const { t } = useTranslation();
  const completedCount = players.filter(p => p.completed).length;

  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {t('marketing.coach_view_team_dashboard')}
            </p>
            <h1 className="text-base font-bold text-foreground">{t('marketing.coach_view_northside_wolves')}</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-full">
            <Users className="w-3 h-3" />
            <span className="text-[10px] font-semibold">{t('marketing.coach_view_coach_view_badge')}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-emerald-600">{completedCount}</p>
            <p className="text-[9px] text-muted-foreground uppercase">{t('marketing.coach_view_done')}</p>
          </div>
          <div className="bg-amber-500/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-amber-600">{players.length - completedCount}</p>
            <p className="text-[9px] text-muted-foreground uppercase">{t('marketing.coach_view_pending')}</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-primary">60%</p>
            <p className="text-[9px] text-muted-foreground uppercase">{t('marketing.coach_view_rate')}</p>
          </div>
        </div>

        {/* Player list */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('marketing.coach_view_activity_header')}
          </p>
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.name}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  player.completed ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-muted/30"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  player.completed ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {player.initial}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{player.name}</p>
                  {player.completed ? (
                    <p className="text-[10px] text-emerald-600">Completed at {player.time}</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">{t('marketing.coach_view_not_yet_started')}</p>
                  )}
                </div>
                {player.completed && (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trend */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-3 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs font-medium">{t('marketing.coach_view_great_week')}</p>
            <p className="text-[10px] text-muted-foreground">{t('marketing.coach_view_trend_detail')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
