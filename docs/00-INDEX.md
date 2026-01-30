# Driverly Documentation Index

## Overview
Driverly is a multi-tenant driver management platform for medical transportation companies.

## Core Documentation

| Document | Description |
|----------|-------------|
| [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) | System architecture, tech stack, and data flow |
| [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) | Database tables, relationships, and RLS policies ⚠️ *Historical - see migrations for current schema* |
| [03-AUTHENTICATION.md](./03-AUTHENTICATION.md) | Auth system, roles, and JWT claims |
| [04-FRONTEND-GUIDELINES.md](./04-FRONTEND-GUIDELINES.md) | Design system, components, and UI patterns |
| [05-TESTING-STRATEGY.md](./05-TESTING-STRATEGY.md) | Testing approach and coverage |

## Development Workflow

| Document | Description |
|----------|-------------|
| [GETTING-STARTED.md](./GETTING-STARTED.md) | Setup instructions for new developers |
| [AGENT-WORKFLOW.md](./AGENT-WORKFLOW.md) | AI agent development guidelines |
| [BUILD-PLAN.md](./BUILD-PLAN.md) | Implementation roadmap and phases |
| [ROADMAP.md](./ROADMAP.md) | Future features and product roadmap |

## Implementation Status

> **Last Updated:** 2026-01-20
> **Milestone:** v1.0 Driver & Vehicle Credentialing Complete ✅

### Completed Features

| Feature | Description | Status |
|---------|-------------|--------|
| SA-001 | Company Management (list, create, edit, status) | ✅ Complete |
| SA-002 | Admin Invitations (invite, accept, resend) | ✅ Complete |
| AD-001 | Driver Applications (public form, admin review) | ✅ Complete |
| AD-002 | Driver Management (list, detail, status) | ✅ Complete |
| AD-003 | Vehicle Management (CRUD, detail pages) | ✅ Complete |
| AD-004 | Vehicle Assignment (assign, transfer, history) | ✅ Complete |
| AD-005 | Credential Types (admin configuration, instruction builder) | ✅ Complete |
| AD-007 | Broker Management (CRUD, driver assignments) | ✅ Complete |
| DR-001 | Driver Onboarding (checklist, status toggle) | ✅ Complete |
| DR-002 | Driver Profile Management | ✅ Complete |
| DR-003 | Driver Vehicle Management (1099/W2) | ✅ Complete |
| DR-004 | Credential Submission (all submission types, multi-step) | ✅ Complete |

### In Progress / Planned

| Feature | Description | Status |
|---------|-------------|--------|
| AD-006 | Credential Review Queue | 📝 [CODEX-012](./CODEX-012-AD-006-credential-review.md) |
| UX-001 | UX Consistency Across Portals | 📝 [CODEX-013](./CODEX-013-UX-consistency.md) |
| AD-005+ | Credential Type Refactor | 📋 [CODEX-020](./CODEX-TASK-020-credential-type-refactor.md) |
| AD-005+ | Credential Editor Tabs | 📋 [CODEX-021](./CODEX-TASK-021-credential-type-editor-tabs.md) |

## CODEX Tasks

### Active Tasks

| Task | Description | Status |
|------|-------------|--------|
| [CODEX-030-FF-001](./CODEX-030-FF-001-feature-flags.md) | Feature Flags System (Phase 0) | ✅ Complete |
| [CODEX-031-BILLING-001](./CODEX-031-BILLING-001-subscription-system.md) | Billing System (Phase 0.5) | ✅ Mostly Complete |
| [CODEX-032-FF-001-Tests](./CODEX-032-FF-001-automated-tests.md) | FF-001 Automated Tests | 📋 Ready |
| [CODEX-033-BILLING-Remaining](./CODEX-033-BILLING-001-remaining-items.md) | Billing Remaining Items (P0/P1) | 🔥 Next Up |
| [CODEX-012-AD-006](./CODEX-012-AD-006-credential-review.md) | AD-006 Credential Review Queue | ⏳ In Progress |
| [CODEX-013-UX](./CODEX-013-UX-consistency.md) | UX Consistency Across Portals | ⏳ Pending |
| [CODEX-TASK-020](./CODEX-TASK-020-credential-type-refactor.md) | Credential Type Refactor (deprecate submission_type) | 📋 Planned |
| [CODEX-TASK-021](./CODEX-TASK-021-credential-type-editor-tabs.md) | Credential Editor - Requirements/Expiration/Settings Tabs | 📋 Planned |

### Archived Tasks (Completed)

> Completed CODEX tasks have been moved to [`docs/archive/codex-tasks/`](./archive/codex-tasks/).
> These document the original implementation specs but the codebase has evolved beyond them.

| Task Range | Description |
|------------|-------------|
| CODEX-TASK-001 to 011 | Core platform build (auth, companies, drivers, vehicles, credentials) |
| CODEX-TASK-012 to 019 | Credential builder phases, vehicle bugs, credential detail views |

## Feature Specifications

### Super Admin Features
- [SA-001 Company Management](./features/super-admin/SA-001-company-management.md)
- [SA-002 Admin Invitations](./features/super-admin/SA-002-admin-invitations.md)

### Admin Features
- [AD-001 Driver Applications](./features/admin/AD-001-driver-applications.md)
- [AD-002 Driver Management](./features/admin/AD-002-driver-management.md)
- [AD-003 Vehicle Management](./features/admin/AD-003-vehicle-management.md)
- [AD-004 Vehicle Assignment](./features/admin/AD-004-vehicle-assignment.md)
- [AD-005 Credential Types](./features/admin/AD-005-credential-types.md)
- [AD-006 Credential Review](./features/admin/AD-006-credential-review.md)
- [AD-007 Broker Management](./features/admin/AD-007-broker-management.md)

### Driver Features
- [DR-001 Onboarding](./features/driver/DR-001-onboarding.md)
- [DR-002 Profile Management](./features/driver/DR-002-profile-management.md) ✅
- [DR-003 Vehicle Management](./features/driver/DR-003-vehicle-management.md) ✅
- [DR-004 Credential Submission](./features/driver/DR-004-credential-submission.md) ✅

### Platform Features
- [FF-001 Feature Flags](./features/platform/FF-001-feature-flags.md) ✅ Complete
  - [Implementation Guide](./CODEX-030-FF-001-feature-flags.md)
  - [Test Plan (Manual)](./TEST-PLAN-FF-001-feature-flags.md)
  - [Automated Tests](./CODEX-032-FF-001-automated-tests.md) 📋 Ready for Implementation

### Billing Features (New)
- [BILLING-000 Decisions Needed](./features/billing/BILLING-000-decisions-needed.md) ✅ Decisions Made
- [BILLING-001 Subscription System](./features/billing/BILLING-001-subscription-system.md) 🔥 Next Up

## Architecture Decision Records
- [ADR-001 Multi-Tenancy Approach](./decisions/ADR-001-multi-tenancy-approach.md)
- [ADR-002 Authentication Strategy](./decisions/ADR-002-authentication-strategy.md)
- [ADR-003 RLS JWT Claims Fix](./decisions/ADR-003-rls-jwt-claims-fix.md)

## Database Migrations

26 migrations exist in `supabase/migrations/`:

| Migration | Description |
|-----------|-------------|
| 001_core_tables | Companies, users, invitations |
| 002_fix_user_rls | RLS policy fixes |
| 003_theme_tables | Company theming |
| 004_fix_rls_jwt_claims | JWT claims RLS fix (ADR-003) |
| 005_update_invitations_for_sa002 | SA-002 invitation enhancements |
| 006_driver_vehicle_tables | Drivers and vehicles tables |
| 007_driver_applications | Application workflow |
| 008_public_company_access | Public company lookup |
| 009_credential_storage_bucket | Storage for credentials |
| 010_auto_create_user_profile | Auto user profile creation |
| 011_credential_types | Credential type definitions |
| 012_broker_management | Brokers and assignments |
| 013_vehicle_assignment | Vehicle assignment workflow |
| 014_driver_onboarding | Onboarding progress tracking |
| 015_credential_submission | Credential submission workflow |
| 016_driver_profile | Profile management, audit log, notifications |
| 017_driver_vehicle_management | Vehicle photos, status tracking, driver RLS |
| 018_fix_rls_policies | RLS policy adjustments |
| 019_fix_driver_vehicle_rls | Driver vehicle RLS fixes |
| 020_fix_driver_credential_insert | Driver credential insert RLS |
| 021_broker_assignment_settings | Broker assignment mode settings |
| 022_credential_instruction_builder | JSONB instruction config for credential builder |
| 023_credential_progress | Step progress tracking for multi-step credentials |
| 024_admin_ensure_driver_credential | RPC to ensure driver credential records exist |
| 025_admin_ensure_vehicle_credential | RPC to ensure vehicle credential records exist |

## Code Organization

### Key Directories

| Path | Purpose |
|------|---------|
| `src/types/` | TypeScript type definitions (use barrel export from `index.ts`) |
| `src/services/` | Supabase data access layer |
| `src/hooks/` | React Query hooks for data fetching |
| `src/lib/` | Utilities, theme, query keys |
| `src/components/features/` | Feature-specific components by domain |
| `src/components/ui/` | Reusable UI components (design system) |
| `src/pages/` | Route components by role (admin, driver, super-admin) |

### Archived Scripts

Debug and one-time fix scripts have been moved to [`scripts/archive/`](../scripts/archive/).
