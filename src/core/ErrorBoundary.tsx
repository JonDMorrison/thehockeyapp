import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "./logger";
import { supabase } from "@/integrations/supabase/client";

function redact(value: string, maxLength: number): string {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[id]")
    .slice(0, maxLength);
}

async function reportClientError(error: Error, errorInfo: ErrorInfo): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("client_error_events").insert({
      user_id: session.user.id,
      route: window.location.pathname.slice(0, 500),
      message: redact(error.message || "Unknown UI error", 500),
      component_stack: errorInfo.componentStack
        ? redact(errorInfo.componentStack, 2000)
        : null,
      release: import.meta.env.MODE,
      user_agent: navigator.userAgent.slice(0, 500),
    });
  } catch {
    // Error reporting must never make the original failure worse.
  }
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error("Uncaught UI error", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    void reportClientError(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
            <span className="text-3xl">🏒</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            An unexpected error occurred. Please reload the page and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
