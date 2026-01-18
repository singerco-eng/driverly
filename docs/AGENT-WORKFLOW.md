# Agent Workflow: Codex + Opus Collaboration

> **Purpose:** Define how to effectively chain GPT 5.2 Codex (builder) and Claude Opus (auditor) for development.

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT CYCLE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │   CODEX     │───►│   OPUS      │───►│   CODEX     │    │
│   │   Build     │    │   Audit     │    │   Fix       │    │
│   └─────────────┘    └─────────────┘    └─────────────┘    │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│   Code Created       Issues Found       Issues Fixed        │
│                                                             │
│                    Repeat until ✓                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Role Definitions

### Codex (Builder)

**Strengths:**
- Fast code generation
- Pattern following
- Implementation from specs

**Tasks:**
- Write code from spec documents
- Implement components
- Write migrations
- Create tests

### Opus (Auditor)

**Strengths:**
- Deep spec understanding (wrote them)
- Cross-reference checking
- Architecture coherence
- Edge case identification

**Tasks:**
- Review code against specs
- Check RLS policies
- Verify component patterns match guidelines
- Identify missing pieces
- Validate business logic

---

## Task Prompt Templates

### For Codex: Migration Tasks

```markdown
## Context
You are building the Driverly platform. Read the following docs first:
- docs/02-DATABASE-SCHEMA.md (full schema reference)
- docs/01-ARCHITECTURE.md (patterns and conventions)

## Task
Create the SQL migration for [TABLE_NAME].

## Requirements from Schema Doc
[Paste relevant section from 02-DATABASE-SCHEMA.md]

## Output
Create file: supabase/migrations/XXX_[name].sql

Include:
1. CREATE TABLE with all columns and constraints
2. Indexes for foreign keys and common queries  
3. RLS policies as specified in schema doc
4. Comments on complex constraints

## Conventions
- Use UUID for all PKs
- Include created_at, updated_at on all tables
- Use snake_case for columns
- RLS: Always check company_id for tenant isolation
```

---

### For Codex: Component Tasks

```markdown
## Context
You are building the Driverly platform. Read these docs:
- docs/04-FRONTEND-GUIDELINES.md (component patterns)
- docs/features/[AREA]/[SPEC].md (feature spec)
- Reference: src/components/ui/ (design system components)

## Task
Implement [COMPONENT_NAME] for [FEATURE].

## Spec Reference
[Paste relevant UI section from feature spec]

## Component Requirements
- Use EnhancedDataView for lists (from design system)
- Use ElevatedContainer for modals
- Follow React Query patterns for data fetching
- Use React Hook Form + Zod for forms
- Use design system tokens (not hardcoded colors)

## Output Files
- src/components/features/[area]/[ComponentName].tsx
- src/components/features/[area]/[ComponentName].test.tsx (optional)

## Example Pattern
[Paste similar component from codebase if exists]
```

---

### For Codex: Service/Hook Tasks

```markdown
## Context
You are building the Driverly platform. Read:
- docs/01-ARCHITECTURE.md
- docs/03-AUTHENTICATION.md (for auth-related)
- docs/02-DATABASE-SCHEMA.md (for queries)

## Task
Create the [SERVICE_NAME] service/hook.

## Requirements
[Paste from spec: API/Queries section]

## Patterns to Follow
- Use React Query for data fetching
- Wrap Supabase calls in service functions
- Handle errors consistently
- Include TypeScript types

## Output
- src/services/[serviceName].ts OR
- src/hooks/use[HookName].ts
```

---

### For Opus: Audit Tasks

```markdown
## Audit Request

Please audit the following code against our specs:

### Files to Review
[List files created by Codex]

### Check Against
- docs/02-DATABASE-SCHEMA.md (if migration)
- docs/features/[AREA]/[SPEC].md (if feature)
- docs/04-FRONTEND-GUIDELINES.md (if component)
- docs/03-AUTHENTICATION.md (if auth-related)

### Audit Checklist
1. Does the code match the spec requirements?
2. Are all acceptance criteria addressed?
3. Does it follow our patterns/conventions?
4. Are there missing edge cases?
5. Is RLS correctly implemented (for DB)?
6. Does it use design system correctly (for UI)?
7. Are there any security concerns?

### Output Format
- ✅ Correct: [item]
- ⚠️ Warning: [item] - [reason]
- ❌ Issue: [item] - [required fix]
- 💡 Suggestion: [item] - [improvement idea]
```

---

## Workflow by Task Type

### Database Migrations

```
1. CODEX: "Create migration for [table] per 02-DATABASE-SCHEMA.md"
   Output: supabase/migrations/XXX_table.sql

2. OPUS: Audit migration
   - Check columns match schema doc
   - Check constraints
   - Check RLS policies
   - Check indexes

3. CODEX: Fix any issues

4. RUN: Apply migration locally
   supabase migration up

5. OPUS: Generate/update TypeScript types
   supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Feature Components

```
1. CODEX: "Implement [Feature] UI per [SPEC].md"
   Output: Components, pages, services

2. OPUS: Audit against spec
   - All acceptance criteria covered?
   - Correct components used?
   - Proper patterns followed?

3. CODEX: Fix issues

4. MANUAL: Visual test in browser

5. OPUS: E2E test (if critical path)
```

### Auth/Security

```
1. CODEX: "Implement [auth feature] per 03-AUTHENTICATION.md"

2. OPUS: Security audit
   - JWT claims correct?
   - RLS policies enforced?
   - Route protection working?
   - No exposed secrets?

3. CODEX: Fix issues

4. MANUAL: Test auth flows
```

---

## Context Management

### What to Include in Codex Prompts

**Always:**
- Relevant spec document section
- File paths for output
- Pattern examples from existing code

**When Building UI:**
- Component from design system to use
- Acceptance criteria checklist
- Wireframe/layout from spec

**When Building Services:**
- Database schema for relevant tables
- Query examples from spec
- Error handling expectations

### What NOT to Include

- Entire spec documents (too long)
- Unrelated features
- Implementation details of other features

### Context Document Priority

```
Tier 1 (Always reference):
├── 00-INDEX.md (overview, glossary)
├── 01-ARCHITECTURE.md (patterns)
└── Specific feature spec

Tier 2 (When relevant):
├── 02-DATABASE-SCHEMA.md (for DB work)
├── 03-AUTHENTICATION.md (for auth)
└── 04-FRONTEND-GUIDELINES.md (for UI)

Tier 3 (Reference only):
├── 05-TESTING-STRATEGY.md
└── Other feature specs (for cross-reference)
```

---

## Task Sizing

### Good Task Size (Codex can handle)

✅ "Create the `companies` table migration"
✅ "Implement CompanyList component with EnhancedDataView"
✅ "Create useCompanies hook with CRUD operations"
✅ "Implement the company create/edit modal"

### Too Large (Split up)

❌ "Implement SA-001 Company Management"
→ Split into: Migration, List component, Detail page, Create modal, Edit modal

❌ "Build the entire admin section"
→ Split by feature spec: AD-001, AD-002, etc.

### Too Small (Combine)

❌ "Add the name field to company form"
→ Combine: "Implement company form with all fields"

---

## Error Recovery

### Codex Produces Wrong Pattern

```
OPUS identifies: "Using useState for server data instead of React Query"

Fix prompt to Codex:
"Refactor [component] to use React Query for data fetching.
Pattern to follow: [paste from 04-FRONTEND-GUIDELINES.md]"
```

### Missing Spec Details

```
OPUS identifies: "Spec doesn't define behavior for [edge case]"

You decide: Document the decision
Then: "Add handling for [edge case]: [your decision]"
```

### Integration Issues

```
OPUS identifies: "Component X doesn't connect to service Y correctly"

Fix prompt: "Connect [Component] to [Service] following this pattern: [example]"
```

---

## Iteration Checklist

After each Codex → Opus cycle:

- [ ] Code compiles without errors
- [ ] Linting passes
- [ ] Types are correct
- [ ] Spec acceptance criteria addressed
- [ ] Patterns match guidelines
- [ ] No security issues flagged
- [ ] Visual appearance matches wireframe (if UI)
- [ ] Manual test passes

---

## First Tasks: Project Bootstrap

### Task 1: Project Setup

**For Codex:**
```
Set up the Driverly project:
1. Initialize from Vite React TS template
2. Copy component structure from existing design system
3. Configure Supabase client
4. Set up routing structure
5. Create placeholder pages for each role

Reference: docs/BUILD-PLAN.md section 0.4 for structure
```

### Task 2: Core Migration

**For Codex:**
```
Create the core database tables migration.
Reference: docs/02-DATABASE-SCHEMA.md - Core Tables section

Create: supabase/migrations/001_core_tables.sql
Include: companies, users tables with RLS
```

### Task 3: Auth Setup

**For Codex:**
```
Implement authentication layer.
Reference: docs/03-AUTHENTICATION.md

Create:
- src/contexts/AuthContext.tsx
- src/hooks/useAuth.ts
- src/pages/auth/Login.tsx
- src/components/layouts/ProtectedRoute.tsx
```

---

## Quality Gates

Before moving to next feature:

1. **Database:** Migration applied, types generated
2. **Auth:** RLS tested for role
3. **UI:** Matches spec wireframes
4. **Logic:** Business rules enforced
5. **Tests:** Critical paths covered
