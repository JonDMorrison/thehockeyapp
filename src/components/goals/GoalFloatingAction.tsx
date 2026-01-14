import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Target, Sparkles } from 'lucide-react';

interface GoalFloatingActionProps {
  visible: boolean;
  onClick: () => void;
}

export function GoalFloatingAction({ visible, onClick }: GoalFloatingActionProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-24 right-4 z-50"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={onClick}
              size="lg"
              className="h-14 px-5 rounded-full shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
              >
                <Target className="w-5 h-5" />
              </motion.div>
              <span className="font-semibold">Set Goal</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
            </Button>
          </motion.div>
          
          {/* Pulse ring effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20 -z-10"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
