import React from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
  /** Transition mode: slide for hierarchical, fade for tab switches */
  mode?: "slide" | "fade" | "scale";
}

// Slide transition for drilling down into content
const slideVariants: Variants = {
  initial: { 
    x: "100%", 
    opacity: 0,
  },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 }
    }
  },
  exit: { 
    x: "-25%", 
    opacity: 0,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.15 }
    }
  }
};

// Fade transition for tab switches (same level)
const fadeVariants: Variants = {
  initial: { 
    opacity: 0,
    y: 8,
  },
  animate: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94] // easeOut
    }
  },
  exit: { 
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.15,
      ease: [0.55, 0.06, 0.68, 0.19] // easeIn
    }
  }
};

// Scale transition for modals/overlays
const scaleVariants: Variants = {
  initial: { 
    opacity: 0,
    scale: 0.96,
  },
  animate: { 
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.15,
      ease: [0.55, 0.06, 0.68, 0.19]
    }
  }
};

const variantMap = {
  slide: slideVariants,
  fade: fadeVariants,
  scale: scaleVariants,
};

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  mode = "fade" 
}) => {
  const location = useLocation();
  const variants = variantMap[mode];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Hook to determine transition type based on navigation
export function useNavigationDirection() {
  const location = useLocation();
  const [direction, setDirection] = React.useState<"forward" | "back">("forward");
  const prevPathRef = React.useRef(location.pathname);

  React.useEffect(() => {
    const prevPath = prevPathRef.current;
    const currentPath = location.pathname;
    
    // Simple heuristic: deeper paths = forward, shallower = back
    const prevDepth = prevPath.split("/").filter(Boolean).length;
    const currentDepth = currentPath.split("/").filter(Boolean).length;
    
    if (currentDepth > prevDepth) {
      setDirection("forward");
    } else if (currentDepth < prevDepth) {
      setDirection("back");
    }
    
    prevPathRef.current = currentPath;
  }, [location.pathname]);

  return direction;
}

// Wrapper that auto-detects slide direction
export const SmartPageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const direction = useNavigationDirection();
  const location = useLocation();
  
  // Determine if this is a tab switch (same level navigation)
  const isTabSwitch = React.useMemo(() => {
    const tabPaths = ["/today", "/teams", "/players", "/settings"];
    return tabPaths.some(tab => location.pathname === tab);
  }, [location.pathname]);

  return (
    <PageTransition mode={isTabSwitch ? "fade" : "slide"}>
      {children}
    </PageTransition>
  );
};