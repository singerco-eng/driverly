# CODEX-047: EMAIL-001 Branded Email Templates

> **Enhancement task:** All transactional emails (invitations, application confirmations,
> approval/rejection notices) are plain, unstyled HTML with no Flowcred branding. Create a
> shared branded email template that mirrors the Flowcred homepage aesthetic — dark header/footer,
> gold accent, Flowcred logo — and apply it to all 4 email-sending edge functions.

---

## Prerequisites

Before starting:
1. Read every file listed in **Required Reading** below
2. Understand that all emails are sent via the Resend API from Supabase Edge Functions (Deno)
3. The shared module pattern already exists — see `_shared/cors.ts` for how edge functions import shared code
4. Email HTML must use table-based layout with inline styles (no external CSS, no `<style>` blocks — many email clients strip them)

---

## Required Reading

```
supabase/functions/send-invitation/index.ts          # Initial invitation email
supabase/functions/resend-invitation/index.ts        # Invitation reminder email
supabase/functions/application-status-email/index.ts # Approval/rejection email
supabase/functions/submit-application/index.ts       # Application confirmation email (lines 267-294)
supabase/functions/_shared/cors.ts                   # Existing shared module pattern
src/styles/website.css                               # Website theme — brand colors reference
public/flowcred-logo.svg                             # Logo SVG (for reference — not used directly in emails)
```

---

## Brand Reference

These values come from `src/styles/website.css` and the homepage (`src/pages/website/HomePage.tsx`).
The email should feel like it belongs to the same product.

| Token                | Value                  | Usage                           |
|----------------------|------------------------|---------------------------------|
| Background (dark)    | `#1a1917`              | Header and footer background    |
| Elevated surface     | `#232220`              | Optional subtle card bg         |
| Foreground (cream)   | `#e8e6e0`              | Text on dark backgrounds        |
| Gold accent          | `#d4a017`              | Divider bar, heading accents    |
| Gold light           | `#e6b422`              | Hover/secondary gold            |
| Muted text           | `#918e8a`              | Footer text, fine print         |
| Warm border          | `#353330`              | Subtle borders on dark bg       |
| Content bg (light)   | `#faf9f7`              | Main content area background    |
| Content text         | `#2d2b29`              | Body text on light background   |
| Content muted        | `#6b6865`              | Secondary text on light bg      |
| Font stack           | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | All text |

---

## Design Spec

The email layout uses a **hybrid dark-header/footer + light-content** pattern. This gives
strong brand recognition while keeping the main content readable across all email clients
(Gmail, Outlook, Apple Mail, mobile).

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│  DARK HEADER  (#1a1917)                         │
│  ┌─────────────────────────────────────────┐    │
│  │  Flowcred logo (image, left-aligned)    │    │
│  │  Height: ~40px, padding: 24px 32px      │    │
│  └─────────────────────────────────────────┘    │
│  ── Gold divider bar (3px, #d4a017) ──────────  │
├─────────────────────────────────────────────────┤
│  CONTENT AREA  (#faf9f7)                        │
│  padding: 32px                                  │
│                                                 │
│  [Heading — 24px, bold, color varies]           │
│  [Body paragraphs — 16px, #2d2b29]             │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │        [ CTA BUTTON ]                   │    │
│  │  bg: company primary_color or #d4a017   │    │
│  │  text: white, 16px bold                 │    │
│  │  border-radius: 24px (pill shape)       │    │
│  │  padding: 14px 32px                     │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [Expiry / secondary info — 14px, #6b6865]      │
├─────────────────────────────────────────────────┤
│  DARK FOOTER  (#1a1917)                         │
│  padding: 24px 32px                             │
│  ┌─────────────────────────────────────────┐    │
│  │  "Powered by Flowcred AI"               │    │
│  │  color: #918e8a, font-size: 13px        │    │
│  │  flowcred.ai link in gold (#d4a017)     │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Logo in Emails

The Flowcred logo must be served from a publicly accessible URL. Email clients block inline
SVG and may block base64-encoded images.

**Use this URL:** `https://app.flowcred.ai/flowcred-logo.svg`

This file is already deployed in `public/flowcred-logo.svg` and served by the production build.

Always include fallback `alt` text: `alt="Flowcred AI"` so the brand name shows if the
image is blocked.

Set the logo image to: `height="36"` with `width="auto"` (maintain aspect ratio).

---

## Implementation Plan

### Step 1: Create `supabase/functions/_shared/email-template.ts`

Create a shared module that exports a single function to wrap email content in the branded
template. All 4 edge functions will import this.

```typescript
export interface EmailTemplateOptions {
  preheader?: string;
  heading: string;
  headingColor?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  ctaColor?: string;
  footerExtra?: string;
}

export function buildBrandedEmail(options: EmailTemplateOptions): string {
  // Returns a complete HTML email document with:
  // - <!DOCTYPE html> and <html> with lang="en"
  // - <head> with meta charset, viewport, and preheader hidden span
  // - <body> with bgcolor="#e8e6e0" (fallback for clients that strip body styles)
  // - Centered 600px max-width table layout
  // - Dark header with logo image and gold divider
  // - Light content area with heading, body HTML, optional CTA button
  // - Dark footer with "Powered by Flowcred AI"
}
```

**Critical email HTML rules:**
- Use `<table>` layout, NOT `<div>` — Outlook requires tables
- ALL styles must be inline (`style="..."`) — do NOT use `<style>` blocks
- Use `bgcolor` attribute on `<td>` elements as a backup for background colors
- Use `<!--[if mso]>` conditional comments for Outlook-specific fixes if needed
- Button should use a `<table>` + `<td>` with background-color approach (VML button pattern) for Outlook compatibility, OR use the simple `<a>` with padding approach (works everywhere except Outlook desktop where it won't have the background — acceptable trade-off)
- Set `cellpadding="0" cellspacing="0" border="0"` on all tables
- Images need `display: block` and explicit `width`/`height` attributes
- Use `&nbsp;` or `height` on spacer `<td>` elements, not `margin`/`padding` on `<div>`s

**Preheader pattern** (hidden preview text):
```html
<span style="display:none;font-size:1px;color:#faf9f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${preheader text here}
</span>
```

### Step 2: Refactor `send-invitation/index.ts`

Replace the inline HTML string (lines 86-112) with a call to `buildBrandedEmail()`.

**Before (current):**
```typescript
html: `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: ${invitation.company?.primary_color || '#3B82F6'};">
      You're Invited!
    </h1>
    ...
  </div>
`,
```

**After:**
```typescript
import { buildBrandedEmail } from '../_shared/email-template.ts';

// ... existing code ...

const companyColor = invitation.company?.primary_color || '#d4a017';

html: buildBrandedEmail({
  preheader: `You've been invited to join ${companyName}`,
  heading: "You're Invited!",
  headingColor: companyColor,
  body: `
    <p>Hello,</p>
    <p>You've been invited to join <strong>${companyName}</strong> as an <strong>${invitation.role}</strong>.</p>
    <p>Click the button below to accept your invitation and create your account:</p>
  `,
  ctaText: 'Accept Invitation',
  ctaUrl: acceptUrl,
  ctaColor: companyColor,
  footerExtra: `This invitation will expire on ${new Date(invitation.expires_at).toLocaleDateString()}.`,
}),
```

**Note:** The default fallback color changes from `#3B82F6` (generic blue) to `#d4a017`
(Flowcred gold). This is intentional — the emails should feel like Flowcred, not generic.

### Step 3: Refactor `resend-invitation/index.ts`

Replace the inline HTML string (lines 104-127) with a call to `buildBrandedEmail()`.

```typescript
import { buildBrandedEmail } from '../_shared/email-template.ts';

// ... existing code ...

const companyColor = invitation.company?.primary_color || '#d4a017';

html: buildBrandedEmail({
  preheader: `Reminder: You're invited to join ${companyName}`,
  heading: 'Invitation Reminder',
  headingColor: companyColor,
  body: `
    <p>Hello,</p>
    <p>This is a reminder that you've been invited to join <strong>${companyName}</strong> as an <strong>${invitation.role}</strong>.</p>
    <p>Click the button below to accept your invitation and create your account:</p>
  `,
  ctaText: 'Accept Invitation',
  ctaUrl: acceptUrl,
  ctaColor: companyColor,
  footerExtra: `This invitation will expire on ${expiresAt.toLocaleDateString()}.`,
}),
```

### Step 4: Refactor `application-status-email/index.ts`

Replace the inline HTML (lines 77-94) with `buildBrandedEmail()`.

**Approved:**
```typescript
import { buildBrandedEmail } from '../_shared/email-template.ts';

// ... existing code ...

html = buildBrandedEmail({
  preheader: `Great news — your application has been approved`,
  heading: 'Application Approved',
  headingColor: '#16a34a',
  body: `
    <p>Hi ${name},</p>
    <p>Great news — your application has been approved.</p>
    <p>You can continue to your driver portal below:</p>
  `,
  ctaText: 'Go to Driver Portal',
  ctaUrl: `${appUrl}/driver/application-status`,
  ctaColor: '#16a34a',
  footerExtra: `Welcome to ${company?.name ?? 'the team'}!`,
});
```

**Rejected:**
```typescript
html = buildBrandedEmail({
  preheader: `Update on your driver application`,
  heading: 'Application Update',
  headingColor: '#d4a017',
  body: `
    <p>Hi ${name},</p>
    <p>Thank you for applying to drive with ${company?.name ?? 'Driverly'}.</p>
    <p>We are unable to approve your application at this time.</p>
    <p style="color: #6b6865; font-style: italic;">Reason: ${rejectionReason}</p>
    <p>You can check your status below:</p>
  `,
  ctaText: 'Check Application Status',
  ctaUrl: `${appUrl}/driver/application-status`,
  ctaColor: '#d4a017',
});
```

### Step 5: Refactor `submit-application/index.ts`

Replace the inline HTML (lines 281-287) with `buildBrandedEmail()`.

```typescript
import { buildBrandedEmail } from '../_shared/email-template.ts';

// ... existing code ...

html: buildBrandedEmail({
  preheader: `We received your application for ${company.name}`,
  heading: 'Application Received',
  headingColor: '#d4a017',
  body: `
    <p>Hi ${personalInfo.fullName},</p>
    <p>We received your application for <strong>${company.name}</strong>.</p>
    <p>You can check your application status below:</p>
  `,
  ctaText: 'Check Application Status',
  ctaUrl: `${appUrl}/driver/application-status`,
  ctaColor: '#d4a017',
  footerExtra: 'Thanks for applying!',
}),
```

---

## Existing Patterns to Follow

The shared module import pattern is already established:

```typescript
// Every edge function already does this:
import { corsHeaders } from '../_shared/cors.ts';

// You will add:
import { buildBrandedEmail } from '../_shared/email-template.ts';
```

All edge functions use the same Resend API call pattern:

```typescript
const emailResponse = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${resendApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Flowcred AI <noreply@mail.flowcred.ai>',
    to: recipientEmail,
    subject: subjectLine,
    html: buildBrandedEmail({ ... }),
  }),
});
```

Do NOT change the `from`, `to`, `subject`, or the Resend API call structure — only replace
the `html` value.

---

## Files You Will Create

```
supabase/functions/_shared/email-template.ts   # NEW: shared branded email template builder
```

## Files You Will Modify

```
supabase/functions/send-invitation/index.ts          # Replace inline HTML with buildBrandedEmail()
supabase/functions/resend-invitation/index.ts        # Replace inline HTML with buildBrandedEmail()
supabase/functions/application-status-email/index.ts # Replace inline HTML with buildBrandedEmail()
supabase/functions/submit-application/index.ts       # Replace inline HTML with buildBrandedEmail()
```

## Files You Must NOT Modify

```
supabase/functions/_shared/cors.ts                   # Leave as-is
supabase/functions/accept-invitation/index.ts        # Does not send email
src/styles/website.css                               # Reference only
public/flowcred-logo.svg                             # Reference only
```

---

## Constraints

- Do NOT use any external npm packages or template engines — the template is pure string concatenation in a Deno module
- Do NOT use `<style>` blocks or `<link>` stylesheets — inline styles only
- Do NOT use `<div>` for layout — use `<table>`, `<tr>`, `<td>` for email client compatibility
- Do NOT change the Resend API call structure, `from` address, or `subject` lines
- Do NOT change any business logic in the edge functions — only replace the `html` value
- DO use the brand colors from the table above — not the old `#3B82F6` blue
- DO include the Flowcred logo via `<img src="https://app.flowcred.ai/flowcred-logo.svg">`
- DO include `alt="Flowcred AI"` on the logo image
- DO make the template responsive — it should look good on mobile (320px) through desktop (600px)
- DO use the `<!--[if mso]>` pattern for the CTA button if you want Outlook background color support (optional — the simple `<a>` approach is acceptable)

---

## Testing Checklist

After implementing, verify:

1. **Build check:** Run `npx supabase functions serve` to confirm the edge functions start without import errors
2. **Send a test invitation:** From super-admin, invite an email you control. Verify:
   - Email arrives with Flowcred logo in header
   - Gold divider bar visible below header
   - Content area has warm off-white background
   - CTA button is pill-shaped with company primary color
   - Footer shows "Powered by Flowcred AI"
   - Expiry date appears in muted text
3. **Resend a test invitation:** Resend the same invitation. Verify the reminder email has the same branded layout with "Invitation Reminder" heading
4. **Check mobile rendering:** Forward the email to a phone or use Resend's preview. Verify the layout doesn't break at narrow widths
5. **Check with images disabled:** The logo should show "Flowcred AI" alt text; the rest of the email should still be fully readable
