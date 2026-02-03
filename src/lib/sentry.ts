import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: typeof (Sentry as typeof Sentry & { browserTracingIntegration?: () => Sentry.Integration }).browserTracingIntegration === 'function'
      ? [(Sentry as typeof Sentry & { browserTracingIntegration: () => Sentry.Integration }).browserTracingIntegration()]
      : [],
    tracesSampleRate: 0.1,
    enabled: import.meta.env.PROD,
    ignoreErrors: [
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'http://tt.telekomline.de',
      'jigsaw is not defined',
      'ComboSearch is not defined',
      'atomicFindClose',
      'fb_xd_fragment',
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      'AbortError',
      'The operation was aborted',
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^resource:\/\//i,
      /^moz-extension:\/\//i,
    ],
    beforeSend(event) {
      if (import.meta.env.DEV) {
        console.log('[Sentry] Would have sent:', event);
        return null;
      }

      return event;
    },
  });
}

export function setSentryUser(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export { ErrorBoundary } from '@sentry/react';
