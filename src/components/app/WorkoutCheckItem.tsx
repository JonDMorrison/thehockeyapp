import * as React from "react";
import { motion, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface WorkoutCheckItemProps {
  id: string;
  label: string;
  target?: string;
  icon?: React.ReactNode;
  completed?: boolean;
  disabled?: boolean;
  onToggle?: (id: string, completed: boolean) => void;
}

const WorkoutCheckItem = React.forwardRef<HTMLDivElement, WorkoutCheckItemProps>(
  ({ id, label, target, icon, completed = false, disabled = false, onToggle }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false);
    const [showRipple, setShowRipple] = React.useState(false);
    const controls = useAnimation();

    const handleClick = async () => {
      if (disabled) return;

      // Trigger ripple effect
      if (!completed) {
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 600);
      }

      // Animate the checkmark
      if (!completed) {
        await controls.start({
          scale: [1, 1.3, 1],
          transition: { duration: 0.3, times: [0, 0.5, 1] }
        });
      }

      onToggle?.(id, !completed);
    };

    return (
      <motion.div
        ref={ref}
        onClick={handleClick}
        onTapStart={() => !disabled && setIsPressed(true)}
        onTap={() => setIsPressed(false)}
        onTapCancel={() => setIsPressed(false)}
        animate={{
          scale: isPressed ? 0.96 : 1,
          y: isPressed ? 2 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
        className={cn(
          "relative flex items-center gap-4 p-5 rounded-2xl cursor-pointer select-none overflow-hidden",
          "transition-all duration-300 ease-out",
          // Glass morphism base
          "bg-gradient-to-br from-white/80 to-white/60 dark:from-white/10 dark:to-white/5",
          "backdrop-blur-xl",
          "border border-white/40 dark:border-white/10",
          // Shadow that responds to press
          isPressed
            ? "shadow-sm"
            : "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(0,0,0,0.08)]",
          // Completed state
          completed && [
            "bg-gradient-to-br from-success/20 to-success/10 dark:from-success/20 dark:to-success/10",
            "border-success/30",
          ],
          // Disabled state
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{
          transformStyle: "preserve-3d",
          perspective: "1000px",
        }}
        role="checkbox"
        aria-checked={completed}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Ripple effect */}
        {showRipple && (
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-success/30 pointer-events-none"
          />
        )}

        {/* Glow effect on completion */}
        {completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-success/5 pointer-events-none"
          />
        )}

        {/* Icon area - larger and more prominent */}
        <motion.div
          animate={controls}
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 transition-all duration-300",
            completed
              ? "bg-success text-success-foreground shadow-[0_4px_12px_-2px_hsl(var(--success)/0.4)]"
              : "bg-gradient-to-br from-muted to-muted/80 text-text-muted"
          )}
        >
          {completed ? (
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 15,
              }}
            >
              <Check className="w-7 h-7" strokeWidth={3} />
            </motion.div>
          ) : (
            icon || <div className="w-6 h-6 rounded-full border-2 border-current opacity-60" />
          )}
        </motion.div>

        {/* Label and target */}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "block text-base font-semibold transition-all duration-300",
              completed && "text-text-muted line-through decoration-2 decoration-text-muted/40"
            )}
          >
            {label}
          </span>
          {target && (
            <span className="block text-sm text-text-muted mt-0.5">{target}</span>
          )}
        </div>

        {/* Large touch-friendly checkbox indicator */}
        <motion.div
          animate={{
            scale: completed ? 1 : 0.9,
            backgroundColor: completed ? "hsl(var(--success))" : "transparent",
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20,
          }}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-all duration-300",
            completed
              ? "border-0 shadow-[0_2px_8px_-2px_hsl(var(--success)/0.5)]"
              : "border-2 border-border/60 bg-white/50 dark:bg-white/10"
          )}
        >
          {completed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 15,
                delay: 0.1,
              }}
            >
              <Check className="w-5 h-5 text-success-foreground" strokeWidth={3} />
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    );
  }
);
WorkoutCheckItem.displayName = "WorkoutCheckItem";

export { WorkoutCheckItem };
