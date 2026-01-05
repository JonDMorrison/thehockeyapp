import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Sparkles, Target } from 'lucide-react';
import { fireGoalConfetti } from '@/lib/confetti';

interface GoalThermometerProps {
  current: number;
  target: number;
  goalType: 'sessions' | 'shots' | 'participation' | 'badges';
  size?: 'sm' | 'md' | 'lg';
  showMilestones?: boolean;
  className?: string;
  onComplete?: () => void;
}

const milestones = [25, 50, 75, 100];

export function GoalThermometer({
  current,
  target,
  goalType,
  size = 'md',
  showMilestones = true,
  className,
  onComplete,
}: GoalThermometerProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const prevProgressRef = useRef(0);
  
  const progress = Math.min((current / target) * 100, 100);
  const isComplete = progress >= 100;
  const isHot = progress >= 75;
  const isWarm = progress >= 50;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Trigger confetti when goal is completed
  useEffect(() => {
    if (isComplete && !hasTriggeredConfetti && prevProgressRef.current < 100) {
      setHasTriggeredConfetti(true);
      // Delay confetti to sync with animation
      setTimeout(() => {
        fireGoalConfetti();
        onComplete?.();
      }, 1000);
    }
    prevProgressRef.current = progress;
  }, [isComplete, hasTriggeredConfetti, progress, onComplete]);

  const sizeClasses = {
    sm: { container: 'h-24 w-8', bulb: 'w-10 h-10 -bottom-2', text: 'text-xs' },
    md: { container: 'h-40 w-12', bulb: 'w-14 h-14 -bottom-3', text: 'text-sm' },
    lg: { container: 'h-56 w-16', bulb: 'w-20 h-20 -bottom-4', text: 'text-base' },
  };

  const getGradientColors = () => {
    if (isComplete) return 'from-amber-400 via-orange-500 to-red-500';
    if (isHot) return 'from-orange-400 via-orange-500 to-red-500';
    if (isWarm) return 'from-yellow-400 via-orange-400 to-orange-500';
    return 'from-blue-400 via-cyan-400 to-teal-500';
  };

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      {/* Thermometer tube */}
      <div
        className={cn(
          'relative rounded-full bg-muted/50 border-2 border-border overflow-hidden',
          sizeClasses[size].container
        )}
      >
        {/* Fill */}
        <motion.div
          className={cn(
            'absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t',
            getGradientColors()
          )}
          initial={{ height: '0%' }}
          animate={{ height: `${animatedProgress}%` }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {/* Bubbles effect */}
          {animatedProgress > 10 && (
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-white/40"
                  style={{ left: `${20 + i * 25}%` }}
                  animate={{
                    y: [0, -20, -40],
                    opacity: [0.6, 0.4, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.7,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Milestone markers */}
        {showMilestones && milestones.map((milestone) => (
          <div
            key={milestone}
            className="absolute left-0 right-0 flex items-center"
            style={{ bottom: `${milestone}%` }}
          >
            <div
              className={cn(
                'w-full h-0.5',
                animatedProgress >= milestone
                  ? 'bg-white/30'
                  : 'bg-border'
              )}
            />
          </div>
        ))}

        {/* Glow effect when hot */}
        <AnimatePresence>
          {isHot && !isComplete && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                boxShadow: 'inset 0 0 20px rgba(249, 115, 22, 0.5)',
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bulb at bottom */}
      <motion.div
        className={cn(
          'absolute rounded-full border-2 border-border flex items-center justify-center bg-gradient-to-br',
          sizeClasses[size].bulb,
          getGradientColors()
        )}
        animate={isComplete ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: isComplete ? Infinity : 0, repeatDelay: 1 }}
      >
        {isComplete ? (
          <Sparkles className="w-1/2 h-1/2 text-white" />
        ) : isHot ? (
          <Flame className="w-1/2 h-1/2 text-white" />
        ) : (
          <Target className="w-1/2 h-1/2 text-white/80" />
        )}
      </motion.div>

      {/* Progress label */}
      <div className={cn('mt-8 text-center', sizeClasses[size].text)}>
        <div className="font-bold text-foreground">
          {current.toLocaleString()} / {target.toLocaleString()}
        </div>
        <div className="text-muted-foreground">
          {goalType === 'shots' && 'shots'}
          {goalType === 'sessions' && 'sessions'}
          {goalType === 'participation' && '% participation'}
          {goalType === 'badges' && 'badges'}
        </div>
      </div>
    </div>
  );
}
