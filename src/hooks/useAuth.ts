import { useState, useEffect, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });
  
  // Track if initial session check has completed
  const initialSessionChecked = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore SIGNED_OUT events if we still have a valid session in storage
      // This prevents spurious logouts when tabs regain focus
      if (event === 'SIGNED_OUT' && !session) {
        // Double-check storage before accepting logout
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (currentSession) {
            // Session still valid, ignore the SIGNED_OUT event
            setAuthState({
              user: currentSession.user,
              session: currentSession,
              loading: false,
            });
          } else {
            // Truly logged out
            setAuthState({
              user: null,
              session: null,
              loading: false,
            });
          }
        });
        return;
      }
      
      // Only update state after initial session check completes
      // This prevents race condition where listener fires before getSession
      if (initialSessionChecked.current) {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialSessionChecked.current = true;
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    });
    
    return { data, error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!authState.user,
  };
}
