# CODEX-041: Production Error Monitoring with Sentry

> **Copy this entire document when starting the implementation session.**

---

## Context

You are setting up **Sentry** for production error monitoring in Driverly. This captures real errors from real users without requiring test coverage.

### Why This Matters

- Catches JavaScript errors users encounter in production
- Shows stack traces, browser info, and user context
- Groups similar errors together
- Alerts via email/Slack when new errors appear
- **No tests required** - monitors actual user sessions

### What You're Building

1. **Sentry SDK integration** - Captures unhandled errors
2. **React Error Boundary** - Catches component crashes gracefully
3. **User context** - Associates errors with logged-in users
4. **Environment tagging** - Separates dev/staging/production errors

---

## Prerequisites

### 1. Create Sentry Account

1. Go to https://sentry.io and create a free account
2. Create a new project:
   - Platform: **React**
   - Project name: `driverly` (or your preference)
3. Copy the **DSN** from the setup page (looks like `https://xxx@xxx.ingest.sentry.io/xxx`)

### 2. Store DSN Securely

Add to your environment variables:

**Local development** - `.env.local`:
```
VITE_SENTRY_DSN=https://your-dsn-here@xxx.ingest.sentry.io/xxx
```

**Vercel production**:
1. Go to Vercel dashboard → Settings → Environment Variables
2. Add `VITE_SENTRY_DSN` with your DSN value
3. Set for Production and Preview environments

---

## Implementation Order

Execute tasks in this exact order:

### Phase 1: Install & Configure (15 min)

#### Task 1.1: Install Sentry SDK

```bash
npm install @sentry/react
```

#### Task 1.2: Create Sentry Configuration

Create `src/lib/sentry.ts`:

```typescript
import * as Sentry from '@sentry/react';

export function initSentry() {
  // Only initialize if DSN is configured
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    
    // Environment detection
    environment: import.meta.env.MODE, // 'development', 'production'
    
    // Performance monitoring (optional, uses quota)
    // tracesSampleRate: 0.1, // 10% of transactions
    
    // Only send errors in production by default
    enabled: import.meta.env.PROD,
    
    // Filter out noisy errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'http://tt.telekomline.de',
      'jigsaw is not defined',
      'ComboSearch is not defined',
      'atomicFindClose',
      
      // Facebook borked
      'fb_xd_fragment',
      
      // Network errors (user's connection, not our code)
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      
      // User cancelled/aborted actions
      'AbortError',
      'The operation was aborted',
    ],
    
    // Don't send errors from these URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      
      // Firefox extensions
      /^resource:\/\//i,
      /^moz-extension:\/\//i,
    ],
    
    // Before sending, you can modify or drop events
    beforeSend(event, hint) {
      // Example: Don't send errors during development even if enabled
      if (import.meta.env.DEV) {
        console.log('[Sentry] Would have sent:', event);
        return null; // Drop the event
      }
      
      return event;
    },
  });
}

// Helper to set user context when they log in
export function setSentryUser(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

// Helper to clear user context on logout
export function clearSentryUser() {
  Sentry.setUser(null);
}

// Helper to add breadcrumbs (user actions leading to error)
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

// Helper to capture exceptions manually
export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Helper to capture messages (non-errors)
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

// Re-export ErrorBoundary for use in components
export { ErrorBoundary } from '@sentry/react';
```

#### Task 1.3: Initialize Sentry in App Entry Point

Update `src/main.tsx` to initialize Sentry before rendering:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSentry } from './lib/sentry';
import './styles/index.css';

// Initialize Sentry first
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### Phase 2: Add Error Boundaries (10 min)

#### Task 2.1: Create App-Level Error Boundary

Create `src/components/ErrorFallback.tsx`:

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We've been notified and are looking into it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.DEV && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-mono text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            {resetError && (
              <Button onClick={resetError} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            <Button onClick={() => window.location.href = '/'}>
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Task 2.2: Wrap App with Error Boundary

Update `src/App.tsx` to wrap the router with Sentry's ErrorBoundary:

Find the main return statement and wrap with ErrorBoundary:

```typescript
import { ErrorBoundary } from '@/lib/sentry';
import { ErrorFallback } from '@/components/ErrorFallback';

// In the component return, wrap the outermost element:
return (
  <ErrorBoundary
    fallback={({ error, resetError }) => (
      <ErrorFallback error={error} resetError={resetError} />
    )}
  >
    {/* existing app content */}
  </ErrorBoundary>
);
```

---

### Phase 3: Add User Context (5 min)

#### Task 3.1: Set User on Auth State Change

Find your auth provider or the place where you handle login state. Add Sentry user context:

In your auth hook or provider (likely `src/contexts/AuthContext.tsx` or similar):

```typescript
import { setSentryUser, clearSentryUser } from '@/lib/sentry';

// When user logs in or auth state changes:
useEffect(() => {
  if (user) {
    setSentryUser({
      id: user.id,
      email: user.email,
      role: user.role, // if available
    });
  } else {
    clearSentryUser();
  }
}, [user]);
```

---

### Phase 4: Verify Setup (5 min)

#### Task 4.1: Test Error Capture

Temporarily add a test button somewhere visible (remove after testing):

```typescript
<Button 
  onClick={() => { throw new Error('Test Sentry Error'); }}
  variant="destructive"
>
  Test Sentry
</Button>
```

Or in browser console on your production/preview site:
```javascript
throw new Error('Test Sentry from console');
```

#### Task 4.2: Check Sentry Dashboard

1. Go to https://sentry.io
2. Navigate to your project → Issues
3. You should see your test error appear within 1-2 minutes

---

## Environment Variables Summary

| Variable | Where | Value |
|----------|-------|-------|
| `VITE_SENTRY_DSN` | `.env.local` | Your Sentry DSN (local dev) |
| `VITE_SENTRY_DSN` | Vercel | Your Sentry DSN (production) |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/sentry.ts` | Create | Sentry configuration and helpers |
| `src/main.tsx` | Modify | Initialize Sentry on app start |
| `src/components/ErrorFallback.tsx` | Create | User-friendly error UI |
| `src/App.tsx` | Modify | Wrap app with ErrorBoundary |
| Auth context | Modify | Set user context on login |

---

## Optional Enhancements

### Add Performance Monitoring

Uncomment `tracesSampleRate` in sentry.ts config:
```typescript
tracesSampleRate: 0.1, // 10% of page loads
```

Note: This uses more of your Sentry quota.

### Add Source Maps for Better Stack Traces

Add to `vite.config.ts` build section:
```typescript
build: {
  sourcemap: true, // Enable source maps
}
```

Then in Vercel, add environment variable:
```
SENTRY_AUTH_TOKEN=your-auth-token
```

(Get auth token from Sentry → Settings → Auth Tokens)

### Add Slack/Email Alerts

1. In Sentry dashboard → Settings → Integrations
2. Add Slack or configure email alerts
3. Go to Alerts → Create Alert Rule
4. Set conditions (e.g., "When new issue seen")

---

## Verification Checklist

- [ ] Sentry SDK installed (`npm list @sentry/react`)
- [ ] DSN configured in environment variables
- [ ] `initSentry()` called in `main.tsx`
- [ ] ErrorBoundary wrapping App
- [ ] ErrorFallback component shows friendly error UI
- [ ] Test error appears in Sentry dashboard
- [ ] User context set on login (check Sentry event details)

---

## What Sentry Gives You

After setup, you'll automatically capture:

1. **Unhandled JavaScript errors** - Any `throw` or rejected promise
2. **React component crashes** - Via ErrorBoundary
3. **Console errors** - If configured
4. **User context** - Who hit the error
5. **Breadcrumbs** - User actions before the error
6. **Environment** - Dev vs production
7. **Browser/OS info** - Chrome, Safari, mobile, etc.

### Reading Error Reports

When an error appears in Sentry:

1. **Title** - The error message
2. **Stack trace** - Where it happened in your code
3. **User** - Who was affected
4. **Tags** - Environment, browser, etc.
5. **Breadcrumbs** - What the user did before the error

---

## Cost

Sentry free tier includes:
- 5,000 errors/month
- 1 team member
- 30-day data retention

This is plenty for early launch. Upgrade when you need more.

---

## Start Here

1. Create Sentry account and project
2. Copy your DSN
3. Add DSN to `.env.local` and Vercel
4. Follow Phase 1-4 in order
5. Verify test error appears in Sentry dashboard

Good luck!
