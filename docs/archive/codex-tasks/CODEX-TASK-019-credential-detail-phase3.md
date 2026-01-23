# TASK 019: Unified Credential Detail - Phase 3 (Admin Features)

## Context

Add admin-specific features to the unified credential detail view: review panel, submit on behalf, and integration with the credential type builder.

## Prerequisites

- Phase 1 complete (CODEX-017)
- Phase 2 complete (CODEX-018)

---

## Task 1: Admin Review Panel

**File:** `src/components/features/credentials/AdminReviewPanel.tsx`

Review actions for admins:
- Approve button
- Reject button with reason input
- Request Changes button with notes
- Set expiration date (for approvals)
- Review notes field

Integrates with existing `useCredentialReview` hook.

---

## Task 2: Submit On Behalf

Update CredentialDetailView to support admin submission:
- When admin is viewing driver/vehicle credential
- Can fill out forms, upload documents, sign on behalf
- Submission goes to review queue (not auto-approved)
- Records "submitted by" as admin user

---

## Task 3: Admin Credential Routes

**New routes:**
- `/admin/drivers/:driverId/credentials/:typeId` → CredentialDetailView (mode: review)
- `/admin/vehicles/:vehicleId/credentials/:typeId` → CredentialDetailView (mode: review)

**Update existing pages:**
- Driver detail page: link to credential detail
- Vehicle detail page: link to credential detail
- Credential review queue: link to detail view

---

## Task 4: Builder Preview Integration

Update `CredentialTypeEditor.tsx`:
- Preview button navigates to preview route
- Or renders CredentialDetailView inline with previewConfig
- Full-page preview experience
- Close returns to editor

---

## Task 5: Credential History Updates

Update `CredentialHistoryTimeline.tsx`:
- Show "Submitted by [Admin Name] on behalf of [Driver]"
- Show all step completions in history
- Show document uploads per step

---

## Acceptance Criteria

- [ ] Admin can approve/reject from detail view
- [ ] Admin can submit on behalf of driver/vehicle
- [ ] Submission on behalf goes to review queue
- [ ] Admin routes work correctly
- [ ] Links from driver/vehicle pages work
- [ ] Builder preview uses unified component
- [ ] History shows on-behalf submissions

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/features/credentials/AdminReviewPanel.tsx` | Create |
| `src/components/features/credentials/CredentialDetailView.tsx` | Update |
| `src/App.tsx` | Add admin routes |
| `src/pages/admin/DriverDetail.tsx` | Add credential links |
| `src/pages/admin/VehicleDetail.tsx` | Add credential links |
| `src/pages/admin/CredentialTypeEditor.tsx` | Update preview |
| `src/components/features/driver/CredentialHistoryTimeline.tsx` | Update |
