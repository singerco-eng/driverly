# Architecture Decision Records (ADRs)

This folder contains Architecture Decision Records documenting significant technical decisions made during Driverly development.

## What is an ADR?

An Architecture Decision Record captures an important architectural decision along with its context and consequences.

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./ADR-001-multi-tenancy-approach.md) | Multi-Tenancy Approach | Accepted | 2026-01 |
| [ADR-002](./ADR-002-authentication-strategy.md) | Authentication Strategy | Accepted | 2026-01 |
| [ADR-003](./ADR-003-rls-jwt-claims-fix.md) | RLS JWT Claims Fix | Accepted | 2026-01 |

## ADR Template

When adding a new ADR, use this template:

```markdown
# ADR-XXX: Title

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?
```

## How to Add a New ADR

1. Create a new file: `ADR-XXX-short-title.md`
2. Use the template above
3. Add an entry to this README's index
4. Get team review before marking as "Accepted"
