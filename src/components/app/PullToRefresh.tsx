import React, { useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: React.ReactNode;
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Whether refresh is currently in progress */
  isRefreshing?: boolean;
  /** Threshold in pixels before triggering refresh */
  threshold?: number;
  /** Custom className for the container */
  className?: string;
  /** Disable pull to refresh */
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  isRefreshing = false,
  threshold = 80,
  className,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  
  const y = useMotionValue(0);
  const controls = useAnimation();
  
  // Transform values for the indicator
  const indicatorOpacity = useTransform(y, [0, threshold * 0.5, threshold], [0, 0.5, 1]);
  const indicatorScale = useTransform(y, [0, threshold], [0.5, 1]);
  const indicatorRotation = useTransform(y, [0, threshold, threshold * 1.5], [0, 180, 180]);
  
  // Progress for the circular indicator
  const progress = useTransform(y, [0, threshold], [0, 1]);

  const isCurrentlyRefreshing = isRefreshing || internalRefreshing;

  const handleDragStart = () => {
    if (disabled || isCurrentlyRefreshing) return;
    
    // Only allow pull if scrolled to top
    const container = containerRef.current;
    if (container && container.scrollTop > 5) return;
    
    setIsPulling(true);
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled || isCurrentlyRefreshing) return;
    
    // Only allow pulling down
    if (info.offset.y < 0) {
      y.set(0);
      return;
    }
    
    // Check if at top of scroll
    const container = containerRef.current;
    if (container && container.scrollTop > 5) {
      y.set(0);
      return;
    }
    
    // Apply resistance as we pull further
    const resistance = info.offset.y > threshold ? 0.4 : 0.8;
    const newY = Math.min(info.offset.y * resistance, threshold * 2);
    y.set(newY);
    
    setCanRefresh(newY >= threshold);
  };

  const handleDragEnd = useCallback(async () => {
    if (disabled) return;
    
    setIsPulling(false);
    
    if (canRefresh && !isCurrentlyRefreshing) {
      // Hold at threshold position while refreshing
      await controls.start({
        y: threshold,
        transition: { type: "spring", stiffness: 400, damping: 30 }
      });
      
      setInternalRefreshing(true);
      setCanRefresh(false);
      
      try {
        await onRefresh();
      } finally {
        setInternalRefreshing(false);
        // Animate back to origin
        await controls.start({
          y: 0,
          transition: { type: "spring", stiffness: 400, damping: 30 }
        });
      }
    } else {
      // Spring back to origin
      setCanRefresh(false);
      controls.start({
        y: 0,
        transition: { type: "spring", stiffness: 400, damping: 30 }
      });
    }
  }, [canRefresh, controls, disabled, isCurrentlyRefreshing, onRefresh, threshold]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
        style={{ 
          top: -40,
          opacity: indicatorOpacity,
          scale: indicatorScale,
        }}
      >
        <motion.div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-primary/10 border border-primary/20 backdrop-blur-sm",
            canRefresh && "bg-primary/20 border-primary/30"
          )}
        >
          {isCurrentlyRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <motion.div style={{ rotate: indicatorRotation }}>
              <ArrowDown 
                className={cn(
                  "w-5 h-5 transition-colors",
                  canRefresh ? "text-primary" : "text-muted-foreground"
                )} 
              />
            </motion.div>
          )}
        </motion.div>
      </motion.div>
      
      {/* Draggable content */}
      <motion.div
        style={{ y }}
        animate={controls}
        drag={disabled ? false : "y"}
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="min-h-full"
      >
        {children}
      </motion.div>
      
      {/* Subtle top shadow when pulling */}
      {isPulling && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background/50 to-transparent pointer-events-none z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </div>
  );
};