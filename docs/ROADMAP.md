# Driverly Product Roadmap

> **Created:** 2026-01-20  
> **Last Updated:** 2026-01-20  
> **Status:** Planning

---

## Current State

Driverly has a complete **driver management foundation**:

| Phase | Description | Status |
|-------|-------------|--------|
| Super Admin | Company management, admin invitations | ✅ Complete |
| Admin Core | Drivers, vehicles, assignments, brokers, credentials | ✅ Complete |
| Driver Portal | Onboarding, profile, vehicles, credential submission | ✅ Complete |
| Credential Review | Admin review queue (AD-006) | 🔄 In Progress |

**Migrations:** 17 applied  
**Feature Specs:** 14 written (SA-001/002, AD-001-007, DR-001-004)

---

## Immediate Priority: Platform Foundation & Billing

### Phase 0: Platform Foundation (Current Sprint)

| ID | Feature | Description | Status |
|----|---------|-------------|--------|
| **FF-001** | Feature Flags | Super Admin feature flag system for gradual rollouts | 📋 Planning |

**Why first?** Feature flags enable safe rollout of billing and future features. They allow:
- Per-company feature access control
- "Never bill" test accounts
- Gradual rollout of new capabilities

### Phase 0.5: Billing System

| ID | Feature | Description | Status |
|----|---------|-------------|--------|
| **BILLING-001** | Subscription System | Stripe integration, tier limits, upgrade flow | 📋 Planning |

**Why before new features?** Revenue infrastructure is critical:
- Free tier with operator limits (drivers + vehicles)
- Paid tiers: Starter ($59), Growth ($149), Scale ($349)
- Self-service upgrade via Stripe Checkout
- Super Admin revenue dashboard

**Depends on:** FF-001 (Feature Flags)

---

## Cleanup & QA (Parallel Track)

Before building new features, existing functionality needs review:

### Cleanup Tasks (Per Feature)

| Feature | Cleanup Needed |
|---------|----------------|
| SA-001 Company Management | UI polish, error handling |
| SA-002 Admin Invitations | Edge cases, resend flow |
| AD-001 Driver Applications | Form validation, mobile UX |
| AD-002 Driver Management | Status transitions, notes |
| AD-003 Vehicle Management | Form tabs fix (CODEX-TASK-012 bug) |
| AD-004 Vehicle Assignment | Transfer flow, history display |
| AD-005 Credential Types | Form builder preview |
| AD-006 Credential Review | **Build first (CODEX-012)** |
| AD-007 Broker Management | Eligibility display |
| DR-001 Onboarding | Progress accuracy, edge cases |
| DR-002 Profile Management | Photo upload, email change |
| DR-003 Vehicle Management | 1099 vs W2 flows |
| DR-004 Credential Submission | Multi-doc upload, signature |

### Testing Checklist

- [ ] End-to-end: Super Admin creates company → Admin invites driver → Driver applies → Gets approved → Completes onboarding
- [ ] Role-based access: Verify RLS on all tables
- [ ] Mobile responsiveness: All pages
- [ ] Error states: Network failures, validation errors
- [ ] Edge cases: Empty states, long text, special characters

---

## Future Features (Specs Needed)

### Phase 7: Operations Core

These are **required** for the platform to be operationally useful:

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| **OP-001** | Trip Management | Create, assign, track trips/rides | 🔥 Critical |
| **OP-002** | Scheduling & Availability | Driver schedules, time-off, availability windows | 🔥 Critical |
| **OP-003** | Notifications System | Email/SMS alerts for trips, expirations, status changes | 🔥 Critical |

### Phase 8: Finance & Payments

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| **FIN-001** | Driver Payments | Pay rates, payment records, 1099 tracking | High |
| **FIN-002** | Payroll Integration | W2 employee payroll exports | High |
| **FIN-003** | Trip Billing | Invoice generation for clients/brokers | Medium |

### Phase 9: Analytics & Reporting

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| **RPT-001** | Admin Dashboard | KPIs, charts, at-a-glance metrics | High |
| **RPT-002** | Compliance Reports | Credential status, expiration reports | High |
| **RPT-003** | Driver Analytics | Utilization, trip counts, performance | Medium |

### Phase 10: Integrations

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| **INT-001** | Broker API Integrations | ModivCare, MTM, LogistiCare connections | High |
| **INT-002** | GPS/Tracking | Real-time driver location, ETA | Medium |
| **INT-003** | Calendar Sync | Google/Outlook calendar for drivers | Low |

### Phase 11: Driver Mobile

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| **MOB-001** | Driver Mobile App | React Native or PWA for drivers | High |
| **MOB-002** | Push Notifications | Mobile push for trips, alerts | Medium |

### Phase 12: Extended Features

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| **EXT-001** | Training Modules | Online courses, quizzes, completion tracking | Medium |
| **EXT-002** | Document Library | Company policies, handbooks, contracts | Low |
| **EXT-003** | In-App Messaging | Chat between admin and drivers | Low |
| **EXT-004** | Audit Logging | Comprehensive audit trail for compliance | Low |

---

## Feature Specs to Write

**Format:** Follow existing pattern in `docs/features/`

### Feature Directories

```
docs/features/
├── admin/           # Existing - AD-001 to AD-007
├── driver/          # Existing - DR-001 to DR-004
├── super-admin/     # Existing - SA-001, SA-002
├── platform/        # NEW - FF-001 Feature Flags
├── billing/         # NEW - BILLING-001 Subscription System
├── operations/      # FUTURE - OP-001, OP-002, OP-003
├── finance/         # FUTURE - FIN-001, FIN-002, FIN-003
├── reports/         # FUTURE - RPT-001, RPT-002, RPT-003
├── integrations/    # FUTURE - INT-001, INT-002, INT-003
└── mobile/          # FUTURE - MOB-001, MOB-002
```

### Specs Queue (In Priority Order)

| # | Spec File | Feature | Notes |
|---|-----------|---------|-------|
| 1 | `operations/OP-001-trip-management.md` | Trip Management | Core business logic |
| 2 | `operations/OP-002-scheduling.md` | Scheduling | Driver availability |
| 3 | `operations/OP-003-notifications.md` | Notifications | Email/SMS system |
| 4 | `finance/FIN-001-driver-payments.md` | Driver Payments | Pay tracking |
| 5 | `reports/RPT-001-admin-dashboard.md` | Admin Dashboard | KPIs |
| 6 | `reports/RPT-002-compliance-reports.md` | Compliance Reports | Credential reports |
| 7 | `integrations/INT-001-broker-apis.md` | Broker APIs | External integrations |
| 8 | `finance/FIN-002-payroll.md` | Payroll | W2 integration |
| 9 | `mobile/MOB-001-driver-app.md` | Mobile App | React Native/PWA |
| 10 | `integrations/INT-002-gps-tracking.md` | GPS Tracking | Real-time location |
| 11 | `reports/RPT-003-driver-analytics.md` | Driver Analytics | Performance |
| 12 | `finance/FIN-003-billing.md` | Billing | Client invoicing |
| 13 | `admin/AD-008-training-modules.md` | Training | Online courses |
| 14 | `admin/AD-009-document-library.md` | Documents | Policies/handbooks |
| 15 | `admin/AD-010-messaging.md` | Messaging | In-app chat |

---

## Spec Template

Each spec should include:

```markdown
# [ID]: [Feature Name]

> **Last Updated:** [Date]
> **Status:** Draft
> **Phase:** [Phase Number]

## Overview
[What this feature does and why]

## Access Model
[Who can do what]

## User Stories
[Numbered list of user stories]

## Data Model
[Database tables/columns needed]

## UI Specifications
[Wireframes in ASCII, component descriptions]

## Acceptance Criteria
[Checkboxes for each requirement]

## API/Queries
[Key database queries and functions]

## Business Rules
[Numbered list of rules]

## Dependencies
[What features this depends on]

## Testing Requirements
[Test cases]
```

---

## Recommended Order of Work

### Now (Phase 0)
1. ✅ Complete AD-006 Credential Review (CODEX-012)
2. 🔄 Build FF-001 Feature Flags (Super Admin)
3. Build BILLING-001 Subscription System

### Parallel Track
- Feature-by-feature cleanup and testing
- UX consistency improvements (CODEX-013)

### Next (Phase 7)
4. Write spec: OP-001 Trip Management
5. Write spec: OP-002 Scheduling
6. Write spec: OP-003 Notifications
7. Build: OP-001, OP-002, OP-003

### Then (Phase 8+)
8. Payments and reporting specs
9. Build Phase 8-9
10. Integrations and mobile

---

## Notes

- **Trip Management is the linchpin** - Most other operations features depend on having trips
- **Notifications early** - Needed for credential expiration alerts, trip notifications
- **Mobile can wait** - Web app works on mobile browsers for now
- **Broker APIs complex** - Each broker has different API specs, may need per-broker work
