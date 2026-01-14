import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, PartyPopper, Star, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GoalCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalName: string;
  targetValue: number;
  goalType: string;
  teamName?: string;
}

export function GoalCelebration({ 
  open, 
  onOpenChange, 
  goalName, 
  targetValue, 
  goalType,
  teamName 
}: GoalCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open && !showConfetti) {
      setShowConfetti(true);
      
      // Fire celebration confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF'];

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

      // Big burst
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: colors,
        });
      }, 500);
    }
  }, [open, showConfetti]);

  const handleClose = () => {
    setShowConfetti(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md text-center p-8 overflow-hidden">
        <AnimatePresence>
          {open && (
            <>
              {/* Animated trophy */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="mx-auto mb-6"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                  <PartyPopper className="w-6 h-6 text-amber-500" />
                  Goal Achieved!
                  <PartyPopper className="w-6 h-6 text-amber-500 scale-x-[-1]" />
                </h2>
              </motion.div>

              {/* Goal details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2 mb-6"
              >
                <p className="text-lg font-semibold text-primary">{goalName}</p>
                <p className="text-muted-foreground">
                  {teamName ? `${teamName} reached` : 'Your team reached'}{' '}
                  <span className="font-bold text-foreground">{targetValue.toLocaleString()}</span>{' '}
                  {goalType}!
                </p>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 gap-4 mb-6"
              >
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <Star className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Team Effort</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <Users className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Everyone Contributed</p>
                </div>
              </motion.div>

              {/* Action */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button onClick={handleClose} size="lg" className="w-full">
                  Celebrate & Continue
                </Button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
