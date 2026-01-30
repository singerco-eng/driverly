# Billing System - Decisions FINALIZED ✅

> **Created:** 2026-01-24  
> **Updated:** 2026-01-24  
> **Status:** ✅ Complete - Ready for Implementation  
> **Related:** [BILLING-001-subscription-system.md](./BILLING-001-subscription-system.md)

---

## All Decisions Finalized

### Provider & Model

| Decision | Final Answer |
|----------|--------------|
| Provider | **Stripe** (Checkout + Customer Portal) |
| Billing Model | **Flat subscription** with **operator limits** |
| Free Tier | **Permanent** (not a trial) |
| Enforcement | **Hard block** with upgrade modal |
| Admin Self-Service | **Full** (upgrade, downgrade, cancel, invoices) |
| Super Admin | Override limits, never-bill accounts, revenue dashboard |
| Annual Billing | **Both** monthly + annual (annual = 17% discount) |

---

### Tier Structure (FINALIZED)

| Tier | Monthly | Annual | Operators* | Target Market |
|------|---------|--------|------------|---------------|
| **Free** | $0 | $0 | 4 | Solo operators, testing |
| **Starter** | $59 | $490/yr | 20 | Small fleets getting started |
| **Growth** | $149 | $1,240/yr | 50-99 | Growing companies |
| **Scale** | $349 | $2,900/yr | Unlimited | Large fleets |
| **Enterprise** | Custom | Custom | Unlimited+ | Custom contracts, SLAs |

**\*Operators = Drivers + Vehicles combined**

> **Why "Operators"?** Simpler billing model. A company with 10 drivers and 5 vehicles uses 15 operators. This is fairer for fleets with different driver:vehicle ratios.

**Enterprise:** Visible on pricing page with "Contact Sales" CTA.

---

### Key Decisions

| Item | Decision | Notes |
|------|----------|-------|
| **Free tier limit** | 4 operators (conservative) | Forces upgrade faster |
| **Warning threshold** | 80% | Standard SaaS practice |
| **Feature gates (MVP)** | Operators only | No feature locking for MVP |
| **Feature flag system** | **YES - Build now** | Separate project, enables future gates |
| **Downgrade behavior** | **Option C + Anti-abuse** | Read-only mode + abuse prevention |
| **Plan management** | **Static in code** | Public page accuracy > flexibility |
| **Implementation** | **MVP then iterate** | Phase 1-3 first, polish later |

---

## New Requirements Identified

### 1. "Operators" Concept

**Change from separate driver/vehicle limits to combined "operators":**

```
Old: 15 drivers AND 15 vehicles (30 total possible)
New: 15 operators (drivers + vehicles combined)
```

**Database impact:**
- Single `operator_limit` column instead of `driver_limit` + `vehicle_limit`
- Usage calculation: `SELECT COUNT(*) FROM drivers WHERE company_id = X` + `SELECT COUNT(*) FROM vehicles WHERE company_id = X`

---

### 2. Feature Flag System (Separate Project)

**Requirement:** Build a feature flag system in Super Admin before/alongside billing.

**Proposed approach:**

```sql
-- Feature flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,        -- 'billing_enabled', 'api_access', etc.
  name TEXT NOT NULL,
  description TEXT,
  default_value BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company-specific overrides
CREATE TABLE company_feature_flags (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  flag_id UUID REFERENCES feature_flags(id),
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, flag_id)
);
```

**Super Admin UI:** Toggle flags globally or per-company.

> **Should I create a separate spec for this? (FF-001-feature-flags.md)**

---

### 3. Anti-Abuse Mechanism

**Problem:** User upgrades to Growth (50 operators), adds 50 drivers, then downgrades to Starter (20 operators). They now have 50 drivers on a 20-operator plan.

**Solution options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **A) Lock-in period** | Can't downgrade for 30 days after upgrade | Simple | Frustrating UX |
| **B) Billing cycle lock** | Downgrade takes effect at period end | Stripe default | They still have access |
| **C) Proration + immediate enforcement** | Downgrade immediate, can't add until under limit | Fair | Complex to explain |
| **D) Excess charge** | Downgrade allowed, charge $X per extra operator | Revenue | Confusing |

**Recommendation: Option C** (matches your read-only mode choice)
- Stripe handles proration automatically
- User can downgrade anytime
- Once downgraded, they're immediately in read-only mode for adding operators
- They can edit/delete existing operators but not add new ones
- Banner shows: "You're over your plan limit. Remove X operators or upgrade to add more."

---

## Updated Implementation Plan

| Phase | Focus | Duration |
|-------|-------|----------|
| **0** | Feature Flag System (separate spec) | 2-3 days |
| **1** | Database + Operators concept | 3-4 days |
| **2** | Usage checking + limits | 2-3 days |
| **3** | Admin Billing UI | 4-5 days |
| **4** | Stripe integration | 3-4 days |
| **5** | Super Admin + Anti-abuse | 3-4 days |

---

## Next Steps

1. ✅ Decisions finalized
2. ✅ FF-001 Feature Flags spec created: [`docs/features/platform/FF-001-feature-flags.md`](../platform/FF-001-feature-flags.md)
3. ✅ Roadmap updated with Phase 0 (Feature Flags) and Phase 0.5 (Billing)
4. ⏳ Update BILLING-001 with "operators" concept
5. ⏳ Begin Phase 0 implementation (Feature Flags)

---

## Implementation Order

| Phase | Spec | Description |
|-------|------|-------------|
| **Phase 0** | [FF-001](../platform/FF-001-feature-flags.md) | Feature Flags (blocks billing) |
| **Phase 0.5** | [BILLING-001](./BILLING-001-subscription-system.md) | Subscription System |

**Anti-abuse approach confirmed:** Option C - Immediate enforcement with read-only mode.
