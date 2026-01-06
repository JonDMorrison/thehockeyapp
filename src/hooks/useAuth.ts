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

    // Handle session-only mode: clear auth on page unload if flag is set
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem("auth_session_only") === "true") {
        // Clear the session from localStorage to simulate session-only behavior
        localStorage.removeItem("sb-muwlroahtkdylxwguzyr-auth-token");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
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

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    // If not remembering, we'll handle session cleanup on browser close
    // by storing a flag that the auth listener can check
    if (!rememberMe) {
      sessionStorage.setItem("auth_session_only", "true");
    } else {
      sessionStorage.removeItem("auth_session_only");
    }
    
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
