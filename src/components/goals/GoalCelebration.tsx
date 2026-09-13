import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, PartyPopper, Star, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BRAND_CONFETTI_COLORS } from '@/lib/brand';

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

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: BRAND_CONFETTI_COLORS,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: BRAND_CONFETTI_COLORS,
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
          colors: BRAND_CONFETTI_COLORS,
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
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-brand-strong flex items-center justify-center shadow-lg">
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
                  <PartyPopper className="w-6 h-6 text-primary" />
                  Goal Achieved!
                  <PartyPopper className="w-6 h-6 text-primary scale-x-[-1]" />
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
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <Star className="w-6 h-6 text-primary mx-auto mb-1" />
                  <p className="text-sm font-medium text-foreground">Team Effort</p>
                </div>
                <div className="p-4 rounded-lg bg-success dark:bg-success/30 border border-success dark:border-success">
                  <Users className="w-6 h-6 text-success mx-auto mb-1" />
                  <p className="text-sm font-medium text-success dark:text-success">Everyone Contributed</p>
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
