/**
 * Structured logger utility.
 * Suppressed in production builds for clean console output.
 */

type LogContext = Record<string, unknown>;

const isProd = import.meta.env.PROD;

function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

function log(level: string, message: string, context?: LogContext): void {
  if (isProd) return;

  const prefix = `[${timestamp()}] ${level.toUpperCase()}:`;
  if (context) {
    console.log(prefix, message, context);
  } else {
    console.log(prefix, message);
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    log("debug", message, context);
  },

  info(message: string, context?: LogContext): void {
    log("info", message, context);
  },

  warn(message: string, context?: LogContext): void {
    if (isProd) return;
    const prefix = `[${timestamp()}] WARN:`;
    if (context) {
      console.warn(prefix, message, context);
    } else {
      console.warn(prefix, message);
    }
  },

  error(message: string, context?: LogContext): void {
    if (isProd) return;
    const prefix = `[${timestamp()}] ERROR:`;
    if (context) {
      console.error(prefix, message, context);
    } else {
      console.error(prefix, message);
    }
  },
};
