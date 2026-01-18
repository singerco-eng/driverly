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

## CODEX Tasks (Implementation Tickets)

| Task | Status | Description |
|------|--------|-------------|
| [CODEX-TASK-001](./CODEX-TASK-001.md) | ✅ Complete | Core infrastructure and auth |
| [CODEX-TASK-002](./CODEX-TASK-002.md) | ✅ Complete | Company management (SA-001) |
| [CODEX-TASK-003](./CODEX-TASK-003.md) | ✅ Complete | RLS JWT claims fix |
| [CODEX-TASK-004](./CODEX-TASK-004.md) | ✅ Complete | Admin invitations (SA-002) |

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
- [DR-002 Profile Management](./features/driver/DR-002-profile-management.md)
- [DR-003 Vehicle Management](./features/driver/DR-003-vehicle-management.md)
- [DR-004 Credential Submission](./features/driver/DR-004-credential-submission.md)

## Architecture Decision Records
- [ADR-001 Multi-Tenancy Approach](./decisions/ADR-001-multi-tenancy-approach.md)
- [ADR-002 Authentication Strategy](./decisions/ADR-002-authentication-strategy.md)
- [ADR-003 RLS JWT Claims Fix](./decisions/ADR-003-rls-jwt-claims-fix.md)
