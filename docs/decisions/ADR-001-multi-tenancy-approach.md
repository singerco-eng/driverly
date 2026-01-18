# ADR-001: Multi-Tenancy Approach

## Status
Accepted

## Context

Driverly is a multi-tenant SaaS platform where each tenant (NEMT company) needs isolated data. We need to decide how to implement tenant isolation in the database.

**Options considered:**

1. **Separate databases per tenant** - Each tenant gets their own PostgreSQL database
2. **Separate schemas per tenant** - Single database, each tenant gets own schema
3. **Shared database with row-level security** - Single database/schema, tenant isolation via RLS

## Decision

We will use **Option 3: Shared database with row-level security (RLS)**.

All tenant data will be stored in shared tables with a `company_id` column. Supabase RLS policies will enforce that users can only access their own company's data.

## Consequences

### Positive
- **Simplicity**: Single schema means simpler migrations and maintenance
- **Cost effective**: One database instance, efficient resource utilization
- **Supabase native**: RLS is first-class in Supabase, well-documented patterns
- **Cross-tenant queries**: Super Admin can easily aggregate data across all tenants
- **Scalability**: PostgreSQL handles millions of rows; can add read replicas if needed

### Negative
- **Noisy neighbor risk**: One tenant's heavy queries could affect others (mitigated by connection pooling, query limits)
- **RLS complexity**: Must ensure every query respects RLS; easy to make mistakes
- **No complete isolation**: Theoretical risk of cross-tenant data leakage if RLS misconfigured

### Mitigations
- All tables have RLS enabled by default
- CI tests verify RLS policies
- Code review checklist includes RLS verification
- Regular security audits

## References
- [Supabase Multi-tenancy Guide](https://supabase.com/docs/guides/auth/row-level-security)
- 01-ARCHITECTURE.md - Multi-tenancy section
- 02-DATABASE-SCHEMA.md - RLS policies
