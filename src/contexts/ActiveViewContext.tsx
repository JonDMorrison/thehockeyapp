import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserRole } from "@/hooks/useUserRoles";

interface ActiveViewContextType {
  /** Currently active view/role */
  activeView: UserRole | null;
  /** Set the active view */
  setActiveView: (view: UserRole) => void;
  /** Check if a specific view is active */
  isViewActive: (view: UserRole) => boolean;
  /** Currently active team ID */
  activeTeamId: string | null;
  /** Set the active team */
  setActiveTeamId: (teamId: string | null) => void;
  /** Currently active player ID */
  activePlayerId: string | null;
  /** Set the active player */
  setActivePlayerId: (playerId: string | null) => void;
  /** Currently active association ID */
  activeAssociationId: string | null;
  /** Set the active association */
  setActiveAssociationId: (associationId: string | null) => void;
}

const ActiveViewContext = createContext<ActiveViewContextType | undefined>(undefined);

const STORAGE_KEY = "hockey-app-active-view";
const TEAM_STORAGE_KEY = "hockey-app-active-team";
const PLAYER_STORAGE_KEY = "hockey-app-active-player";
const ASSOCIATION_STORAGE_KEY = "hockey-app-active-association";

export function ActiveViewProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveViewState] = useState<UserRole | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as UserRole) || null;
  });

  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() => {
    return localStorage.getItem(TEAM_STORAGE_KEY);
  });

  const [activePlayerId, setActivePlayerIdState] = useState<string | null>(() => {
    return localStorage.getItem(PLAYER_STORAGE_KEY);
  });

  const [activeAssociationId, setActiveAssociationIdState] = useState<string | null>(() => {
    return localStorage.getItem(ASSOCIATION_STORAGE_KEY);
  });

  const setActiveView = useCallback((view: UserRole) => {
    setActiveViewState(view);
    localStorage.setItem(STORAGE_KEY, view);
  }, []);

  const setActiveTeamId = useCallback((teamId: string | null) => {
    setActiveTeamIdState(teamId);
    if (teamId) {
      localStorage.setItem(TEAM_STORAGE_KEY, teamId);
    } else {
      localStorage.removeItem(TEAM_STORAGE_KEY);
    }
  }, []);

  const setActivePlayerId = useCallback((playerId: string | null) => {
    setActivePlayerIdState(playerId);
    if (playerId) {
      localStorage.setItem(PLAYER_STORAGE_KEY, playerId);
    } else {
      localStorage.removeItem(PLAYER_STORAGE_KEY);
    }
  }, []);

  const setActiveAssociationId = useCallback((associationId: string | null) => {
    setActiveAssociationIdState(associationId);
    if (associationId) {
      localStorage.setItem(ASSOCIATION_STORAGE_KEY, associationId);
    } else {
      localStorage.removeItem(ASSOCIATION_STORAGE_KEY);
    }
  }, []);

  const isViewActive = useCallback(
    (view: UserRole) => activeView === view,
    [activeView]
  );

  // Sync to localStorage whenever values change
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
        activeTeamId,
        setActiveTeamId,
        activePlayerId,
        setActivePlayerId,
        activeAssociationId,
        setActiveAssociationId,
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
