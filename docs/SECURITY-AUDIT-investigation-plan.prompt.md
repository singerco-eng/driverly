# Security Audit Investigation Plan: AI-Generated Code Risks

> **For AI Investigation**: This document provides investigation plans for each security concern. Execute each plan systematically and report findings with severity ratings.

---

## Executive Summary

| # | Technical Area | Gemini's Concern | Preliminary Score | Validity |
|---|---------------|------------------|-------------------|----------|
| 1 | RLS Performance | Repeated `auth.uid()` calls | **🔴 HIGH RISK (2/10)** | **VALID** - 119 instances, 0 cached |
| 2 | Database Querying | Missing FK indexes | **🟡 MEDIUM RISK (6/10)** | **PARTIALLY VALID** - 123 indexes exist, need audit |
| 3 | Input Validation | Context-blind logic | **🟡 MEDIUM RISK (5/10)** | **VALID** - Validation concentrated in 2 files |
| 4 | Architecture | Excessive dependencies | **🟢 LOW RISK (7/10)** | **MINOR** - Clean service layer |
| 5 | Privilege Escalation | Increased attack paths | **🟡 MEDIUM RISK (5/10)** | **VALID** - 43 SECURITY DEFINER functions need audit |

---

## Investigation #1: RLS Performance (auth.uid() Caching)

### The Problem
PostgreSQL's `auth.uid()` function is called fresh for every row evaluated in RLS policies. When you have:
```sql
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
```
The `auth.uid()` call happens **for every row** being checked, not once per query.

### Preliminary Findings
- **119 instances** of `auth.uid()` across 20 SQL migration files
- **0 instances** of `(SELECT auth.uid())` caching pattern
- **208 RLS policies** that likely call `auth.uid()` multiple times per query

### Investigation Tasks

#### Task 1.1: Catalog All auth.uid() Usage
```sql
-- Search for all RLS policies using auth.uid()
-- File locations to check:
supabase/migrations/*.sql
scripts/*.sql
```

**Specific files to audit:**
1. `016_driver_profile.sql` - 10 instances
2. `017_driver_vehicle_management.sql` - 12 instances  
3. `011_credential_types.sql` - 5 instances
4. `014_driver_onboarding.sql` - 7 instances
5. `015_credential_submission.sql` - 5 instances

#### Task 1.2: Identify High-Impact Policies
Look for RLS policies on frequently-queried tables:
- `driver_credentials` - High query volume
- `vehicle_credentials` - High query volume
- `credential_types` - Medium query volume
- `drivers` - High query volume
- `vehicles` - Medium query volume

#### Task 1.3: Performance Impact Assessment
For each policy, determine:
- How many rows are typically scanned?
- How many `auth.uid()` calls per query?
- Is there a subquery multiplier effect?

### Recommended Fix Pattern
```sql
-- BEFORE (BAD - auth.uid() called per row):
CREATE POLICY "Drivers can view own credentials"
  ON driver_credentials FOR SELECT
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- AFTER (GOOD - auth.uid() called once, cached):
CREATE POLICY "Drivers can view own credentials"
  ON driver_credentials FOR SELECT
  USING (driver_id IN (
    SELECT id FROM drivers WHERE user_id = (SELECT auth.uid())
  ));
```

### Deliverables
1. List of all policies needing optimization
2. Prioritized fix order (by query frequency)
3. Migration script to update policies
4. Performance benchmark before/after

---

## Investigation #2: Database Querying (Foreign Key Indexes)

### The Problem
RLS policies often include foreign key lookups. If the FK column isn't indexed, every policy check becomes a full table scan.

### Preliminary Findings
- **109 REFERENCES** constraints (foreign keys defined)
- **123 CREATE INDEX** statements (some indexing exists)
- Need to verify: Are ALL columns used in RLS policy JOINs indexed?

### Investigation Tasks

#### Task 2.1: Extract All FK Columns
Generate a list of all foreign key relationships:
```
company_id → companies(id)
driver_id → drivers(id)
vehicle_id → vehicles(id)
credential_type_id → credential_types(id)
broker_id → brokers(id)
user_id → users(id) / auth.users(id)
```

#### Task 2.2: Map FK Usage in RLS Policies
For each RLS policy, identify which FK columns are used in:
- USING clauses
- WITH CHECK clauses
- Subquery JOINs

#### Task 2.3: Audit Existing Indexes
Cross-reference Task 2.1 and 2.2 against existing indexes:
```sql
-- Check for these specific indexes:
idx_driver_credentials_driver    -- EXISTS ✓
idx_driver_credentials_type      -- EXISTS ✓
idx_driver_credentials_company   -- EXISTS ✓
idx_vehicle_credentials_vehicle  -- EXISTS ✓
-- etc.
```

#### Task 2.4: Identify Missing Indexes
Create a gap analysis:
- Columns used in RLS but NOT indexed
- Columns in frequently-used subqueries

### Key Tables to Audit
1. `driver_credentials` - has 5 indexes
2. `vehicle_credentials` - has 5 indexes
3. `drivers` - check for user_id index
4. `driver_vehicle_assignments` - check for driver_id, vehicle_id indexes

### Deliverables
1. Complete FK → Index mapping
2. List of missing indexes
3. Migration script to add missing indexes
4. Query plan analysis for key RLS policies

---

## Investigation #3: Input Validation (Context-Blind Logic)

### The Problem
AI-generated code often trusts user input without proper validation. Validation may exist but be:
- Bypassed in certain code paths
- Inconsistent across the codebase
- Missing for edge cases

### Preliminary Findings
- **329 Zod validation matches** but in only **2 files**:
  - `src/lib/schemas/database.ts` (303 matches) - comprehensive schemas
  - `src/lib/schemas/application.ts` (26 matches)
- **17 service files** with direct Supabase calls
- Services appear to pass data directly to DB without validation

### Investigation Tasks

#### Task 3.1: Service Layer Audit
For each service file, check:
```typescript
// Does it validate input before DB call?
export async function createCredentialType(
  companyId: string,      // ← Is UUID validated?
  formData: CredentialTypeFormData,  // ← Is this schema validated?
  userId: string,         // ← Is UUID validated?
): Promise<CredentialType>
```

**Files to audit:**
1. `src/services/credentialTypes.ts`
2. `src/services/credentials.ts`
3. `src/services/drivers.ts`
4. `src/services/vehicles.ts`
5. `src/services/brokers.ts`
6. `src/services/applications.ts`
7. `src/services/profile.ts`
8. `src/services/vehicleAssignments.ts`

#### Task 3.2: Schema Coverage Analysis
Map which TypeScript types have corresponding Zod schemas:
```
CredentialType         → credentialTypeSchema? 
CredentialTypeFormData → ???
Driver                 → driverSchema?
Vehicle                → vehicleSchema?
```

#### Task 3.3: Dangerous Input Patterns
Search for:
```typescript
// Direct user input to queries
.eq('id', req.params.id)           // Unvalidated ID
.update(userProvidedData)          // Unvalidated object
JSON.parse(userInput)              // Injection risk
```

#### Task 3.4: Edge Function Audit
Check Supabase Edge Functions for input validation:
```
supabase/functions/accept-invitation/index.ts
supabase/functions/submit-application/index.ts
supabase/functions/create-checkout-session/index.ts
supabase/functions/stripe-webhook/index.ts
```

### Deliverables
1. Service-by-service validation audit
2. Schema coverage gap analysis
3. High-risk input patterns list
4. Recommended validation middleware

---

## Investigation #4: Architecture (Excessive Dependencies)

### The Problem
AI code often duplicates logic instead of abstracting it, leading to:
- Inconsistent behavior between similar functions
- Harder maintenance
- Higher bug surface area

### Preliminary Findings
- **17 service files** - relatively clean separation
- **372 TSX components** - potential for duplication
- **65 TS utility files** - need dedup audit
- Codebase appears moderately well-organized

### Investigation Tasks

#### Task 4.1: Service Layer Duplication
Look for repeated patterns across services:
```typescript
// Example: Is this pattern repeated in multiple files?
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('company_id', companyId);
if (error) throw error;
return data;
```

#### Task 4.2: Component Duplication
Search for similar components:
- `CredentialCard.tsx` vs `DriverCredentialCard.tsx`
- `VehicleCredentialsTab.tsx` (admin) vs `VehicleCredentialsTab.tsx` (driver)
- Multiple modal patterns

#### Task 4.3: Utility Function Audit
Check for duplicated logic in:
```
src/lib/credentialRequirements.ts
src/lib/status-styles.ts
src/lib/onboarding-items.ts
```

#### Task 4.4: Import Analysis
Run dependency analysis:
```bash
# Check for circular dependencies
# Check for overly complex import chains
```

### Deliverables
1. Duplication heatmap
2. Refactoring candidates list
3. Shared abstraction recommendations

---

## Investigation #5: Privilege Escalation Paths

### The Problem
Complex RLS policies and SECURITY DEFINER functions create potential privilege escalation paths. AI code may not properly validate role boundaries.

### Preliminary Findings
- **208 RLS policies** across 24 files
- **43 SECURITY DEFINER functions** (elevated privilege functions)
- Role hierarchy: `super_admin` > `admin` > `coordinator` > `driver`
- JWT claims used for role checking

### Investigation Tasks

#### Task 5.1: SECURITY DEFINER Audit
For each SECURITY DEFINER function, verify:
1. Does it validate the caller's role?
2. Does it validate the caller's company_id?
3. Can it be called with manipulated parameters?

**Critical functions to audit:**
```sql
ensure_driver_credential()
admin_ensure_driver_credential()
ensure_vehicle_credential()
admin_ensure_vehicle_credential()
get_driver_required_credentials()
get_vehicle_required_credentials()
```

#### Task 5.2: Role Boundary Testing
Test these scenarios:
1. Can a driver access another driver's credentials?
2. Can an admin access credentials from another company?
3. Can a coordinator modify admin-only fields?
4. Can anyone call admin_* functions without admin role?

#### Task 5.3: JWT Claim Validation
Check for proper JWT validation:
```sql
-- Are these properly validated?
(auth.jwt() -> 'app_metadata' ->> 'role')
(auth.jwt() -> 'app_metadata' ->> 'company_id')
```

#### Task 5.4: RLS Policy Completeness
For each table, verify all operations are covered:
```
Table: driver_credentials
  SELECT: ✓ Drivers own, Admins company
  INSERT: ✓ Drivers own, Admins company  
  UPDATE: ✓ Drivers own (limited), Admins company
  DELETE: ✓/✗ ???
```

#### Task 5.5: Cross-Company Data Leak
Test if RLS properly isolates:
- Company A's data from Company B
- Driver A's data from Driver B (same company)
- Broker-scoped credentials from other drivers

### Deliverables
1. SECURITY DEFINER function audit report
2. Role boundary test results
3. RLS completeness matrix
4. Recommended security gates

---

## Investigation Execution Order

1. **Start with #5 (Privilege Escalation)** - Highest security impact
2. **Then #1 (RLS Performance)** - Clear problem, easy fix
3. **Then #3 (Input Validation)** - Affects data integrity
4. **Then #2 (FK Indexes)** - Performance optimization
5. **Finally #4 (Architecture)** - Technical debt

---

## Appendix: Quick Commands for Investigation

### Find all auth.uid() patterns
```bash
rg "auth\.uid\(\)" supabase/migrations --type sql -c
```

### Find all SECURITY DEFINER functions
```bash
rg "SECURITY DEFINER" supabase/migrations --type sql -A5
```

### Find all RLS policies
```bash
rg "CREATE POLICY" supabase/migrations --type sql -c
```

### Find Zod validation usage
```bash
rg "z\.(object|string|number)" src --type ts -c
```

### Find direct Supabase calls without validation
```bash
rg "\.from\(['\"]" src/services --type ts
```

---

## Scoring Rubric

| Score | Risk Level | Description |
|-------|------------|-------------|
| 9-10 | 🟢 Excellent | No significant issues |
| 7-8 | 🟢 Good | Minor issues, low priority |
| 5-6 | 🟡 Medium | Notable issues, should address |
| 3-4 | 🟠 High | Significant issues, prioritize |
| 1-2 | 🔴 Critical | Severe issues, address immediately |

---

## Current Assessment Summary

| Area | Score | Immediate Action Required |
|------|-------|---------------------------|
| RLS Performance | 2/10 🔴 | YES - Create migration to wrap auth.uid() |
| FK Indexes | 6/10 🟡 | AUDIT - Verify coverage, add missing |
| Input Validation | 5/10 🟡 | YES - Add validation middleware |
| Architecture | 7/10 🟢 | NO - Minor refactoring opportunities |
| Privilege Escalation | 5/10 🟡 | YES - Audit SECURITY DEFINER functions |

**Overall Platform Security Score: 5/10 (Medium Risk)**

The concerns are valid. The most critical finding is the RLS performance issue with `auth.uid()` - this is a common AI-generated code antipattern that Supabase specifically warns against in their documentation.
