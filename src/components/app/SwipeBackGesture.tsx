import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion";

interface SwipeBackGestureProps {
  children: React.ReactNode;
  /** Whether swipe back is enabled */
  enabled?: boolean;
  /** Callback when swipe back triggers navigation */
  onSwipeBack?: () => void;
  /** Threshold in pixels before triggering back navigation */
  threshold?: number;
}

// Root pages where swipe back should be disabled
const rootPages = ["/today", "/teams", "/players", "/settings", "/", "/welcome", "/auth"];

export const SwipeBackGesture: React.FC<SwipeBackGestureProps> = ({
  children,
  enabled = true,
  onSwipeBack,
  threshold = 80,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [canSwipeBack, setCanSwipeBack] = useState(false);
  
  // Background opacity based on drag progress
  const backdropOpacity = useTransform(x, [0, 150], [0, 0.3]);
  
  // Edge indicator visibility
  const edgeIndicatorOpacity = useTransform(x, [0, 20, 40], [0, 0.5, 0]);
  const edgeIndicatorScale = useTransform(x, [0, 40], [0.8, 1]);

  // Check if we can swipe back on this route
  useEffect(() => {
    setCanSwipeBack(!rootPages.includes(location.pathname));
  }, [location.pathname]);

  const handleDragStart = () => {
    if (!enabled || !canSwipeBack) return;
    setIsDragging(true);
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Only allow right-swipe from left edge
    if (info.offset.x < 0) {
      x.set(0);
      return;
    }
    
    // Apply resistance after threshold
    const resistance = info.offset.x > threshold ? 0.3 : 1;
    const newX = Math.min(info.offset.x * resistance, 200);
    x.set(newX);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    const shouldNavigateBack = info.offset.x > threshold && info.velocity.x > 0;
    
    if (shouldNavigateBack && canSwipeBack) {
      // Animate out and navigate
      controls.start({
        x: window.innerWidth,
        transition: { type: "spring", stiffness: 300, damping: 30 }
      }).then(() => {
        if (onSwipeBack) {
          onSwipeBack();
        } else {
          navigate(-1);
        }
        // Reset position after navigation
        x.set(0);
        controls.set({ x: 0 });
      });
    } else {
      // Spring back to origin
      controls.start({
        x: 0,
        transition: { type: "spring", stiffness: 400, damping: 30 }
      });
    }
  };

  if (!enabled || !canSwipeBack) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Background shadow during swipe */}
      <motion.div
        className="absolute inset-0 bg-black pointer-events-none z-10"
        style={{ opacity: backdropOpacity }}
      />
      
      {/* Left edge swipe indicator */}
      <motion.div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-24 bg-gradient-to-r from-primary/50 to-transparent rounded-r-full z-20 pointer-events-none"
        style={{ 
          opacity: edgeIndicatorOpacity,
          scale: edgeIndicatorScale,
        }}
      />
      
      {/* Main content with drag */}
      <motion.div
        className="relative w-full h-full bg-background"
        style={{ x }}
        animate={controls}
        drag={canSwipeBack ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.2 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        // Only start dragging from left 20px edge
        onPointerDown={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect && e.clientX - rect.left > 30) {
            // Not from edge, disable drag
            e.stopPropagation();
          }
        }}
      >
        {/* Previous page preview (simplified) */}
        {isDragging && (
          <motion.div
            className="absolute inset-y-0 -left-1/3 w-1/3 bg-muted/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
          />
        )}
        
        {children}
      </motion.div>
    </div>
  );
};

// Hook for programmatic swipe-back control
export function useSwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const canSwipeBack = !rootPages.includes(location.pathname);
  
  const goBack = React.useCallback(() => {
    if (canSwipeBack) {
      navigate(-1);
    }
  }, [canSwipeBack, navigate]);
  
  return { canSwipeBack, goBack };
}