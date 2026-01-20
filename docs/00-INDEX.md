# Driverly Documentation Index

## Overview
Driverly is a multi-tenant driver management platform for medical transportation companies.

## Core Documentation

| Document | Description |
|----------|-------------|
| [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) | System architecture, tech stack, and data flow |
| [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) | Database tables, relationships, and RLS policies |
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

### Completed Features

| Feature | Description | Status |
|---------|-------------|--------|
| SA-001 | Company Management (list, create, edit, status) | ✅ Complete |
| SA-002 | Admin Invitations (invite, accept, resend) | ✅ Complete |
| AD-001 | Driver Applications (public form, admin review) | ✅ Complete |
| AD-002 | Driver Management (list, detail, status) | ✅ Complete |
| AD-003 | Vehicle Management (CRUD, detail pages) | ✅ Complete |
| AD-004 | Vehicle Assignment (assign, transfer, history) | ✅ Complete |
| AD-005 | Credential Types (admin configuration) | ✅ Complete |
| AD-007 | Broker Management (CRUD, driver assignments) | ✅ Complete |
| DR-001 | Driver Onboarding (checklist, status toggle) | ✅ Complete |
| DR-004 | Credential Submission (all submission types) | ✅ Complete |

### In Progress / Placeholder

| Feature | Description | Status |
|---------|-------------|--------|
| DR-002 | Driver Profile Management | ✅ Complete |
| DR-003 | Driver Vehicle Management (1099/W2) | ✅ Complete |
| AD-006 | Credential Review Queue | 📝 CODEX-012 |

## CODEX Tasks (Historical Reference)

> **Note:** These tasks document the original implementation specs. The codebase has evolved beyond these initial tickets.

| Task | Description | Implemented |
|------|-------------|-------------|
| [CODEX-TASK-001](./CODEX-TASK-001.md) | Project init, migration 001, app shell | ✅ |
| [CODEX-TASK-002](./CODEX-TASK-002.md) | Authentication layer (context, routes, login) | ✅ |
| [CODEX-TASK-003](./CODEX-TASK-003.md) | SA-001 Company list and create modal | ✅ |
| [CODEX-TASK-004](./CODEX-TASK-004.md) | SA-001 Company detail, edit, status | ✅ |
| [CODEX-TASK-005](./CODEX-TASK-005.md) | AD-005 Credential Types management | ✅ |
| [CODEX-TASK-006](./CODEX-TASK-006.md) | AD-007 Broker Management | ✅ |
| [CODEX-TASK-007](./CODEX-TASK-007.md) | AD-004 Vehicle Assignment | ✅ |
| [CODEX-TASK-008](./CODEX-TASK-008.md) | DR-001 Driver Onboarding | ✅ |
| [CODEX-TASK-009](./CODEX-TASK-009.md) | DR-004 Credential Submission | ✅ |
| [CODEX-TASK-010](./CODEX-TASK-010.md) | DR-002 Driver Profile Management | ✅ |
| [CODEX-TASK-011](./CODEX-TASK-011.md) | DR-003 Driver Vehicle Management | ✅ |
| [CODEX-012-AD-006](./CODEX-012-AD-006-credential-review.md) | AD-006 Credential Review Queue | ⏳ Pending |
| [CODEX-013-UX](./CODEX-013-UX-consistency.md) | UX Consistency Across Portals | ⏳ Pending |
| [CODEX-TASK-015](./CODEX-TASK-015-credential-builder-phase1.md) | Enhanced Credential Builder - Phase 1 | ✅ |
| [CODEX-TASK-016](./CODEX-TASK-016-credential-builder-phase2.md) | Enhanced Credential Builder - Phase 2 | ✅ |
| [CODEX-TASK-017](./CODEX-TASK-017-credential-detail-phase1.md) | Unified Credential Detail - Phase 1 | ✅ |
| [CODEX-TASK-018](./CODEX-TASK-018-credential-detail-phase2.md) | Unified Credential Detail - Phase 2 | ✅ |
| [CODEX-TASK-019](./CODEX-TASK-019-credential-detail-phase3.md) | Unified Credential Detail - Phase 3 | ✅ |
| [CODEX-TASK-020](./CODEX-TASK-020-credential-type-refactor.md) | Credential Type Refactor (deprecate submission_type) | ⏳ Planned |
| [CODEX-TASK-021](./CODEX-TASK-021-credential-type-editor-tabs.md) | Credential Editor - Requirements/Expiration/Settings Tabs | ⏳ Planned |

### Features Implemented Without CODEX Tasks

The following features were implemented directly without formal task documentation:

- **SA-002 Admin Invitations** - `InviteAdminModal`, `CompanyInvitationsTab`, `AcceptInvitation`
- **AD-001 Driver Applications** - Full wizard at `/apply/:slug`, `ApplicationReview`
- **AD-002 Driver Management** - `Drivers.tsx`, `DriverDetail.tsx`, status management
- **AD-003 Vehicle Management** - `Vehicles.tsx`, `VehicleDetail.tsx`, CRUD operations
- **Migrations 002-010** - RLS fixes, theme tables, driver tables, applications, etc.

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
- [DR-004 Credential Submission](./features/driver/DR-004-credential-submission.md)

## Architecture Decision Records
- [ADR-001 Multi-Tenancy Approach](./decisions/ADR-001-multi-tenancy-approach.md)
- [ADR-002 Authentication Strategy](./decisions/ADR-002-authentication-strategy.md)
- [ADR-003 RLS JWT Claims Fix](./decisions/ADR-003-rls-jwt-claims-fix.md)

## Database Migrations

15 migrations exist in `supabase/migrations/`:

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
| 018-021 | Various RLS fixes and broker settings |
| 022_credential_instruction_builder | JSONB instruction config for credential builder |
| 023_credential_progress | Step progress tracking for multi-step credentials |
