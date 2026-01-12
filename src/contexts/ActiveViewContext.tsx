import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserRole } from "@/hooks/useUserRoles";

interface ActiveViewContextType {
  /** Currently active view/role */
  activeView: UserRole | null;
  /** Set the active view */
  setActiveView: (view: UserRole) => void;
  /** Check if a specific view is active */
  isViewActive: (view: UserRole) => boolean;
}

const ActiveViewContext = createContext<ActiveViewContextType | undefined>(undefined);

const STORAGE_KEY = "hockey-app-active-view";

export function ActiveViewProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveViewState] = useState<UserRole | null>(() => {
    // Load from localStorage on initial mount
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as UserRole) || null;
  });

  const setActiveView = useCallback((view: UserRole) => {
    setActiveViewState(view);
    localStorage.setItem(STORAGE_KEY, view);
  }, []);

  const isViewActive = useCallback(
    (view: UserRole) => activeView === view,
    [activeView]
  );

  // Sync to localStorage whenever activeView changes
  useEffect(() => {
    if (activeView) {
      localStorage.setItem(STORAGE_KEY, activeView);
    }
  }, [activeView]);

  return (
    <ActiveViewContext.Provider
      value={{
        activeView,
        setActiveView,
        isViewActive,
      }}
    >
      {children}
    </ActiveViewContext.Provider>
  );
}

export function useActiveView() {
  const context = useContext(ActiveViewContext);
  if (context === undefined) {
    throw new Error("useActiveView must be used within an ActiveViewProvider");
  }
  return context;
}
