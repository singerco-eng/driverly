# ADR-002: Authentication Strategy

## Status
Accepted

## Context

Driverly has four user roles (super_admin, admin, coordinator, driver) across multiple tenants. We need to decide how to handle authentication and authorization.

**Options considered:**

1. **Separate auth instances per role** - Different Supabase projects or auth providers per role
2. **Single auth with custom claims** - One Supabase Auth instance, roles in JWT claims
3. **Single auth with database lookups** - One auth instance, query database for permissions on each request

## Decision

We will use **Option 2: Single Supabase Auth instance with custom claims**.

All users authenticate through the same Supabase Auth. Role and tenant information is stored in `app_metadata` and automatically included in JWT tokens. RLS policies read these claims to enforce access control.

**JWT Claims Structure:**
```json
{
  "app_metadata": {
    "role": "admin",
    "company_id": "uuid",
    "driver_id": "uuid or null"
  }
}
```

## Consequences

### Positive
- **Simplicity**: Single auth system to maintain
- **Performance**: No database lookup needed for basic authorization; claims in JWT
- **Flexibility**: Users could theoretically have roles in multiple companies (future)
- **Supabase native**: JWT claims work seamlessly with RLS policies
- **Session management**: Supabase handles token refresh, session persistence

### Negative
- **Claim staleness**: If role changes, user must re-authenticate to get new claims (mitigated by trigger that updates claims)
- **JWT size**: Claims add to token size (minimal impact)
- **Complexity**: Need database triggers to sync claims when user/driver records change

### Implementation Details
- Database trigger updates `auth.users.raw_app_meta_data` when `users` or `drivers` table changes
- Frontend reads claims from session for UI routing
- RLS policies read claims: `auth.jwt() -> 'app_metadata' ->> 'role'`

## References
- [Supabase Custom Claims](https://supabase.com/docs/guides/auth/jwts)
- 03-AUTHENTICATION.md - Complete auth flows
- 02-DATABASE-SCHEMA.md - JWT sync triggers
