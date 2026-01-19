import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, Flame, Star, Sparkles, Share2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/app/Tag';
import confetti from 'canvas-confetti';

interface SessionCelebrationProps {
  playerName: string;
  isFirstWorkout: boolean;
  practiceTitle?: string;
  isGameDay: boolean;
  tier: string;
  totalShots: number;
  tasksCompleted: number;
  totalTasks: number;
  completedAt?: string;
  teamName?: string;
  onContinue: () => void;
  onBonusTraining?: () => void;
}

const tierLabels: Record<string, string> = {
  rec: "Rec",
  rep: "Rep",
  elite: "Elite",
};

export function SessionCelebration({
  playerName,
  isFirstWorkout,
  practiceTitle,
  isGameDay,
  tier,
  totalShots,
  tasksCompleted,
  totalTasks,
  completedAt,
  teamName,
  onContinue,
  onBonusTraining,
}: SessionCelebrationProps) {
  const [showStats, setShowStats] = useState(false);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    // Fire celebration confetti
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF'];

    // Initial bursts from sides
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();

    // Big center burst
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors,
      });
    }, 500);

    // Extra burst for first workout
    if (isFirstWorkout) {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#FFA500', '#FF8C00'],
          scalar: 1.2,
        });
      }, 1000);
    }

    // Stagger in stats and actions
    const statsTimer = setTimeout(() => setShowStats(true), 600);
    const actionsTimer = setTimeout(() => setShowActions(true), 1000);

    return () => {
      clearTimeout(statsTimer);
      clearTimeout(actionsTimer);
    };
  }, [isFirstWorkout]);

  const formattedTime = completedAt
    ? new Date(completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      {/* Animated Trophy/Award Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 200, 
          damping: 15,
          delay: 0.1
        }}
        className="relative mb-6"
      >
        {/* Glow effect */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: isFirstWorkout 
              ? 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)'
              : 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            transform: 'scale(1.5)',
          }}
        />
        
        <div 
          className="relative w-28 h-28 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: isFirstWorkout
              ? 'linear-gradient(135deg, #FFD700, #FFA500)'
              : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
          }}
        >
          {isFirstWorkout ? (
            <Award className="w-14 h-14 text-white" />
          ) : (
            <Trophy className="w-14 h-14 text-white" />
          )}
          
          {/* Sparkle decorations */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="w-6 h-6 text-amber-400" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="absolute -bottom-1 -left-1"
          >
            <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
          </motion.div>
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold mb-2"
      >
        {isFirstWorkout ? 'First Workout! 🏆' : 'Great Work! 🎉'}
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground mb-4"
      >
        {playerName} completed {isGameDay ? 'game day prep' : practiceTitle || "today's practice"}
      </motion.p>

      {/* Tags */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2 mb-6 flex-wrap justify-center"
      >
        {isFirstWorkout && (
          <Tag variant="accent" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
            <Award className="w-3 h-3" />
            First Workout
          </Tag>
        )}
        {isGameDay ? (
          <Tag variant="accent" className="bg-primary/20 text-primary border-primary/30">
            <Flame className="w-3 h-3" />
            Game Day
          </Tag>
        ) : (
          <Tag variant="tier">{tierLabels[tier] || tier}</Tag>
        )}
      </motion.div>

      {/* Stats Grid */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6"
          >
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold text-primary">{tasksCompleted}/{totalTasks}</p>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
            </div>
            {totalShots > 0 && (
              <div className="p-4 rounded-xl bg-card border border-border">
                <p className="text-2xl font-bold text-primary">{totalShots}</p>
                <p className="text-xs text-muted-foreground">Shots Taken</p>
              </div>
            )}
            {formattedTime && (
              <div className="p-4 rounded-xl bg-card border border-border col-span-2">
                <p className="text-sm text-muted-foreground">Completed at <span className="font-semibold text-foreground">{formattedTime}</span></p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* First workout encouragement */}
      {isFirstWorkout && showStats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 max-w-xs"
        >
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            🌟 This is the start of something great!
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Keep the streak going tomorrow!
          </p>
        </motion.div>
      )}

      {/* Actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs space-y-3"
          >
            <Button 
              onClick={onContinue} 
              className="w-full" 
              size="lg"
            >
              {teamName ? `Back to ${teamName}` : 'Continue'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            {onBonusTraining && (
              <Button 
                variant="outline" 
                onClick={onBonusTraining}
                className="w-full"
                size="lg"
              >
                <Flame className="w-4 h-4 mr-2" />
                Do Bonus Training
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
