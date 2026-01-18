# AD-007: Broker Management

> **Last Updated:** 2026-01-16  
> **Status:** Draft  
> **Phase:** 2 - Admin Core

---

## Overview

Broker Management allows Admins to create and manage relationships with external organizations that contract NEMT trips. Brokers are central to the platform - they determine credential requirements, accepted vehicle types, rates, and ultimately which trips a driver can perform.

**Key Concepts:**
- **Broker** = External organization contracting trips (Medicaid, healthcare networks, nursing homes, etc.)
- **Broker Assignment** = Linking a driver to a broker (admin assigns or driver requests)
- **Broker Eligibility** = Driver meets all requirements to perform trips for a broker

---

## Data Model

### Broker Schema

```sql
CREATE TABLE brokers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  name            text NOT NULL,
  logo_url        text,
  
  -- Contact
  contact_name    text NOT NULL,
  contact_email   text,
  contact_phone   text,
  
  -- Address (optional)
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  zip_code        text,
  
  -- Additional Info
  website         text,
  contract_number text,              -- Internal reference/account number
  notes           text,              -- Internal notes
  
  -- Service Area
  service_states  text[] NOT NULL DEFAULT '{}',  -- States broker operates in
  
  -- Configuration
  accepted_vehicle_types text[] NOT NULL DEFAULT ARRAY['sedan', 'van', 'wheelchair_van', 'stretcher_van'],
  accepted_employment_types text[] NOT NULL DEFAULT ARRAY['w2', '1099'],
  
  -- Status
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES users(id),
  
  UNIQUE(company_id, name)
);

CREATE INDEX idx_brokers_company ON brokers(company_id);
CREATE INDEX idx_brokers_status ON brokers(company_id, status);

-- RLS
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view brokers"
  ON brokers FOR SELECT
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "Admins can manage brokers"
  ON brokers FOR ALL
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

### Driver-Broker Assignment Schema

```sql
CREATE TABLE driver_broker_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  broker_id       uuid NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Assignment Status
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Driver requested, awaiting admin approval
    'assigned',     -- Admin approved/assigned
    'removed'       -- Removed from broker (soft delete for history)
  )),
  
  -- Request tracking
  requested_by    text NOT NULL CHECK (requested_by IN ('admin', 'driver')),
  requested_at    timestamptz NOT NULL DEFAULT now(),
  
  -- Approval tracking
  approved_by     uuid REFERENCES users(id),
  approved_at     timestamptz,
  
  -- Removal tracking
  removed_by      uuid REFERENCES users(id),
  removed_at      timestamptz,
  removal_reason  text,
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(driver_id, broker_id)
);

CREATE INDEX idx_driver_broker_driver ON driver_broker_assignments(driver_id);
CREATE INDEX idx_driver_broker_broker ON driver_broker_assignments(broker_id);
CREATE INDEX idx_driver_broker_status ON driver_broker_assignments(status);

-- RLS
ALTER TABLE driver_broker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company staff can view assignments"
  ON driver_broker_assignments FOR SELECT
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "Drivers can view own assignments"
  ON driver_broker_assignments FOR SELECT
  USING (
    driver_id = (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage assignments"
  ON driver_broker_assignments FOR ALL
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Drivers can request assignment"
  ON driver_broker_assignments FOR INSERT
  WITH CHECK (
    driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
    AND requested_by = 'driver'
    AND status = 'pending'
  );
```

### Broker Rates Schema

```sql
CREATE TABLE broker_rates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id       uuid NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Rate Configuration
  vehicle_type    text NOT NULL CHECK (vehicle_type IN ('sedan', 'van', 'wheelchair_van', 'stretcher_van')),
  
  -- Rates
  base_rate       decimal(10,2) NOT NULL,  -- Base rate per trip
  per_mile_rate   decimal(10,4) NOT NULL,  -- Rate per mile
  
  -- Effective Dates (for rate history)
  effective_from  date NOT NULL DEFAULT CURRENT_DATE,
  effective_to    date,                     -- NULL = current rate
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES users(id),
  
  -- Only one active rate per broker/vehicle_type
  UNIQUE(broker_id, vehicle_type, effective_from)
);

CREATE INDEX idx_broker_rates_broker ON broker_rates(broker_id);
CREATE INDEX idx_broker_rates_active ON broker_rates(broker_id, effective_to) 
  WHERE effective_to IS NULL;

-- RLS
ALTER TABLE broker_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view rates"
  ON broker_rates FOR SELECT
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "Admins can manage rates"
  ON broker_rates FOR ALL
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

---

## Broker Eligibility Calculation

A driver is **eligible** for a broker when ALL of the following are true:

```typescript
function isDriverEligibleForBroker(driver: Driver, broker: Broker): boolean {
  // 1. Driver employment type accepted
  if (!broker.accepted_employment_types.includes(driver.employment_type)) {
    return false;
  }
  
  // 2. Driver in broker's service area (state)
  if (!broker.service_states.includes(driver.state)) {
    return false;
  }
  
  // 3. All global driver credentials valid
  const globalDriverCreds = getDriverCredentials(driver.id, 'global');
  if (!allCredentialsValid(globalDriverCreds)) {
    return false;
  }
  
  // 4. All broker-specific driver credentials valid
  const brokerDriverCreds = getDriverCredentials(driver.id, broker.id);
  if (!allCredentialsValid(brokerDriverCreds)) {
    return false;
  }
  
  // 5. Has at least one eligible vehicle
  const vehicles = getDriverVehicles(driver.id);
  const hasEligibleVehicle = vehicles.some(vehicle => 
    isVehicleEligibleForBroker(vehicle, broker)
  );
  
  return hasEligibleVehicle;
}

function isVehicleEligibleForBroker(vehicle: Vehicle, broker: Broker): boolean {
  // 1. Vehicle type accepted by broker
  if (!broker.accepted_vehicle_types.includes(vehicle.vehicle_type)) {
    return false;
  }
  
  // 2. Vehicle is active
  if (vehicle.status !== 'active') {
    return false;
  }
  
  // 3. All global vehicle credentials valid
  const globalVehicleCreds = getVehicleCredentials(vehicle.id, 'global');
  if (!allCredentialsValid(globalVehicleCreds)) {
    return false;
  }
  
  // 4. All broker-specific vehicle credentials valid
  const brokerVehicleCreds = getVehicleCredentials(vehicle.id, broker.id);
  if (!allCredentialsValid(brokerVehicleCreds)) {
    return false;
  }
  
  return true;
}
```

---

## User Stories

### Admin Stories

1. **As an Admin**, I want to create a broker so that I can track trip sources and requirements.

2. **As an Admin**, I want to configure which vehicle types a broker accepts so that only appropriate drivers are eligible.

3. **As an Admin**, I want to set broker rates (base + per-mile) so that driver pay can be calculated.

4. **As an Admin**, I want to assign drivers to a broker so that they can perform trips for that broker.

5. **As an Admin**, I want to bulk-assign multiple drivers to a broker for efficiency.

6. **As an Admin**, I want to see which drivers are eligible vs. assigned for a broker so that I can identify gaps.

7. **As an Admin**, I want to approve or deny driver requests to join a broker.

8. **As an Admin**, I want to remove a driver from a broker if needed.

9. **As an Admin**, I want to deactivate a broker so that no new trips can be assigned but history is preserved.

10. **As an Admin**, I want to see broker-specific credentials so that I know what's required.

### Driver Stories

11. **As a Driver**, I want to see which brokers I'm assigned to so that I know what trips I can accept.

12. **As a Driver**, I want to see my eligibility status per broker so that I know what credentials I need.

13. **As a Driver**, I want to request to join a broker so that I can expand my trip opportunities.

14. **As a Driver**, I want to see credential requirements for a broker so that I can prepare.

---

## UI Specifications

### 1. Broker List (Admin)

**Route:** `/admin/brokers`

**Component:** `EnhancedDataView` (card/table toggle)

```
┌─────────────────────────────────────────────────────────────────┐
│  Brokers                                 [Card|Table] [+ Add]   │
├─────────────────────────────────────────────────────────────────┤
│  [Search...]  [Status ▼]                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  MedTrans                           ● Active      │   │
│  │         medicaid@medtrans.com • (555) 123-4567          │   │
│  │         Service Area: TX, OK, LA                         │   │
│  │                                                          │   │
│  │         12 Drivers Assigned  •  10 Eligible              │   │
│  │         Vehicles: Sedan, Wheelchair Van                  │   │
│  │         3 Required Credentials                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  StateHealth Transport              ● Active      │   │
│  │         contact@statehealth.gov • (555) 987-6543        │   │
│  │         Service Area: TX                                 │   │
│  │                                                          │   │
│  │         8 Drivers Assigned  •  8 Eligible                │   │
│  │         Vehicles: All Types                              │   │
│  │         2 Required Credentials                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  Senior Care Network                ○ Inactive    │   │
│  │         dispatch@seniorcare.com • (555) 456-7890        │   │
│  │         Service Area: TX                                 │   │
│  │                                                          │   │
│  │         5 Drivers Assigned  •  0 Eligible                │   │
│  │         Vehicles: Wheelchair Van, Stretcher Van          │   │
│  │         4 Required Credentials                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Showing 3 brokers                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Card Fields:**
| Field | Display |
|-------|---------|
| Logo | Broker logo or placeholder |
| Name | Broker name |
| Status | Active (green), Inactive (gray) |
| Contact | Email and phone |
| Service Area | List of states |
| Driver Stats | "X Assigned • Y Eligible" |
| Vehicle Types | Accepted types or "All Types" |
| Credentials | "N Required Credentials" |

**Filters:**
| Filter | Options |
|--------|---------|
| Search | Name, contact |
| Status | All, Active, Inactive |

---

### 2. Create/Edit Broker

**Trigger:** "+ Add" button or edit action

**Component:** `ElevatedContainer` with `FormToggle` tabs

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Broker                                             [X]  │
├─────────────────────────────────────────────────────────────────┤
│  [Basic Info]  [Service Area]  [Requirements]  [Rates]          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  BASIC INFO TAB                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Broker Name *                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ MedTrans                                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Logo                                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         [Upload Logo]                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Primary Contact *                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ John Smith                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ Email                  │  │ Phone                  │        │
│  │ john@medtrans.com      │  │ (555) 123-4567         │        │
│  └────────────────────────┘  └────────────────────────┘        │
│                                                                 │
│  Website                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://medtrans.com                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Contract/Account Number                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ MT-2026-001                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Address (Optional)                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 123 Healthcare Blvd                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ... (city, state, zip)                                        │
│                                                                 │
│  Internal Notes                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Main Medicaid broker for Texas region                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ═══════════════════════════════════════════════════════════   │
│  SERVICE AREA TAB                                               │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Service States *                                               │
│  Select the states this broker operates in:                     │
│                                                                 │
│  ☑ Texas (TX)                                                  │
│  ☑ Oklahoma (OK)                                               │
│  ☑ Louisiana (LA)                                              │
│  ☐ Arkansas (AR)                                               │
│  ☐ New Mexico (NM)                                             │
│  ... [Show All States]                                         │
│                                                                 │
│  ℹ️ Drivers outside these states will not be eligible          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ═══════════════════════════════════════════════════════════   │
│  REQUIREMENTS TAB                                               │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Accepted Vehicle Types *                                       │
│  ☑ Sedan                                                       │
│  ☐ Van                                                         │
│  ☑ Wheelchair Van                                              │
│  ☐ Stretcher Van                                               │
│                                                                 │
│  Accepted Employment Types *                                    │
│  ☑ W2 Employees                                                │
│  ☑ 1099 Independent Contractors                                │
│                                                                 │
│  Broker-Specific Credentials                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ No credentials configured for this broker yet.          │   │
│  │ [+ Add Credential Type]                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ℹ️ Credentials can be added after creating the broker         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ═══════════════════════════════════════════════════════════   │
│  RATES TAB                                                      │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Set the rates paid by this broker per vehicle type:            │
│                                                                 │
│  Sedan                                                          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ Base Rate    │  │ Per Mile     │                            │
│  │ $ 15.00      │  │ $ 1.25       │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                 │
│  Wheelchair Van                                                 │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ Base Rate    │  │ Per Mile     │                            │
│  │ $ 25.00      │  │ $ 1.75       │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                 │
│  Effective Date                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ January 16, 2026                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ℹ️ Previous rates will be preserved for historical records    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Broker]            │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Broker Detail View

**Route:** `/admin/brokers/[id]`

**Layout:** Header + tabbed content

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Brokers                                              │
│                                                                 │
│  [LOGO]  MedTrans                             ● Active          │
│          medicaid@medtrans.com • (555) 123-4567                │
│          Service Area: TX, OK, LA                               │
│                                                                 │
│          [Edit]  [•••]                                          │
│                                                                 │
│  [Overview]  [Drivers]  [Credentials]  [Rates]  [Settings]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    [Tab Content]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Header Actions:**
- **Edit** → Open edit modal
- **[•••] Menu:**
  - Deactivate/Activate Broker

---

### Tab: Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 12           │  │ 10           │  │ 2            │          │
│  │ Assigned     │  │ Eligible     │  │ Pending      │          │
│  │ Drivers      │  │ Drivers      │  │ Requests     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  Contact Information                                            │
│  ───────────────────────────────────────────────────────────── │
│  Primary Contact    John Smith                                  │
│  Email              john@medtrans.com                           │
│  Phone              (555) 123-4567                              │
│  Website            https://medtrans.com                        │
│  Contract #         MT-2026-001                                 │
│                                                                 │
│  Requirements                                                   │
│  ───────────────────────────────────────────────────────────── │
│  Vehicle Types      Sedan, Wheelchair Van                       │
│  Employment Types   W2, 1099                                    │
│  Credentials        3 required (2 driver, 1 vehicle)           │
│                                                                 │
│  Current Rates                                                  │
│  ───────────────────────────────────────────────────────────── │
│  Sedan              $15.00 base + $1.25/mile                   │
│  Wheelchair Van     $25.00 base + $1.75/mile                   │
│  Effective since: January 1, 2026                               │
│                                                                 │
│  Notes                                                          │
│  ───────────────────────────────────────────────────────────── │
│  Main Medicaid broker for Texas region                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Tab: Drivers

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Drivers                                         [+ Assign]     │
│                                                                 │
│  [All] [Eligible] [Ineligible] [Pending Requests]              │
│  [Search driver...]                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [JS]  John Smith           ✓ Eligible        1099       │   │
│  │       2022 Toyota Camry (Sedan)                         │   │
│  │       All credentials complete                          │   │
│  │                                            [Remove]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [JD]  Jane Doe             ⚠ Ineligible      W2         │   │
│  │       Assigned Jan 10, 2026                             │   │
│  │       Missing: Medicaid Certification                   │   │
│  │                                            [Remove]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Pending Requests (2)                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [BW]  Bob Wilson           ⏳ Pending         1099       │   │
│  │       Requested Jan 15, 2026                            │   │
│  │       Would be eligible if approved                     │   │
│  │                              [Approve]  [Deny]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**"+ Assign" Modal:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Assign Drivers to MedTrans                                [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Search drivers...]                                            │
│                                                                 │
│  Available Drivers (showing eligible first)                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ Mike Johnson       ✓ Would be eligible    1099        │   │
│  │   2021 Honda Accord (Sedan)                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ Sarah Williams     ⚠ Would be ineligible  1099        │   │
│  │   Missing: 2 credentials                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ Tom Brown          ✕ Wrong state (CA)     1099        │   │
│  │   Not in broker's service area                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Select All Eligible]                                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Assign Selected (2)]    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Tab: Credentials

Shows broker-specific credential types. Links to AD-005.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Broker Credentials                        [+ Add Credential]   │
│                                                                 │
│  These credentials are required in addition to global           │
│  credentials for drivers and vehicles working with MedTrans.    │
│                                                                 │
│  Driver Credentials                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 Medicaid Certification              Required          │   │
│  │    Document Upload • Valid for 12 months                │   │
│  │    10 of 12 assigned drivers have this                  │   │
│  │                                        [Edit] [Remove]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✍️ MedTrans Agreement                   Required          │   │
│  │    Signature • Never Expires                            │   │
│  │    11 of 12 assigned drivers have this                  │   │
│  │                                        [Edit] [Remove]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Vehicle Credentials                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 MedTrans Vehicle Approval            Required          │   │
│  │    Admin Verified • Never Expires                       │   │
│  │    8 of 10 assigned vehicles have this                  │   │
│  │                                        [Edit] [Remove]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Tab: Rates

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Broker Rates                                    [Update Rates] │
│                                                                 │
│  Current Rates (Effective Jan 1, 2026)                          │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Sedan                                                   │   │
│  │ Base Rate: $15.00    Per Mile: $1.25                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Wheelchair Van                                          │   │
│  │ Base Rate: $25.00    Per Mile: $1.75                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Rate History                                                   │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Oct 1, 2025 - Dec 31, 2025                              │   │
│  │ Sedan: $14.00 + $1.15/mi • Wheelchair: $22.00 + $1.50/mi│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Jan 1, 2025 - Sep 30, 2025                              │   │
│  │ Sedan: $12.00 + $1.00/mi • Wheelchair: $20.00 + $1.25/mi│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Update Rates Modal:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Update Broker Rates                                       [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  New rates will take effect on the specified date.              │
│  Current rates will be preserved for historical calculations.   │
│                                                                 │
│  Effective Date *                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ February 1, 2026                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Sedan                                                          │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ Base Rate *        │  │ Per Mile *         │                │
│  │ $ 16.00            │  │ $ 1.30             │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                 │
│  Wheelchair Van                                                 │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ Base Rate *        │  │ Per Mile *         │                │
│  │ $ 27.00            │  │ $ 1.85             │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save New Rates]         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Driver Portal: My Brokers

**Route:** `/driver/brokers`

```
┌─────────────────────────────────────────────────────────────────┐
│  My Brokers                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Assigned Brokers                                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  MedTrans                       ✓ Eligible        │   │
│  │                                                          │   │
│  │ All credentials complete                                 │   │
│  │ You can accept trips from this broker                    │   │
│  │                                                          │   │
│  │                                  [View Requirements]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  StateHealth Transport          ⚠ Ineligible      │   │
│  │                                                          │   │
│  │ Missing credentials:                                     │   │
│  │ • StateHealth Training Certificate                       │   │
│  │                                                          │   │
│  │                                  [View Requirements]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Pending Requests                                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  Senior Care Network            ⏳ Pending         │   │
│  │                                                          │   │
│  │ Awaiting admin approval                                  │   │
│  │ Requested: Jan 15, 2026                                  │   │
│  │                                                          │   │
│  │                                  [Cancel Request]        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Available Brokers                              [Request to Join]│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  City Medical Transport                           │   │
│  │         Accepts: Sedan, Wheelchair Van                   │   │
│  │         3 required credentials                           │   │
│  │                                                          │   │
│  │                              [View Details] [Request]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**View Requirements Modal:**

```
┌─────────────────────────────────────────────────────────────────┐
│  MedTrans Requirements                                     [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Vehicle Types Accepted                                         │
│  ✓ Sedan                                                       │
│  ✓ Wheelchair Van                                              │
│                                                                 │
│  Required Credentials                                           │
│                                                                 │
│  Driver Credentials                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Medicaid Certification           Approved Jan 10      │   │
│  │ ✓ MedTrans Agreement               Signed Jan 10        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Vehicle Credentials (2022 Toyota Camry)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ MedTrans Vehicle Approval        Approved Jan 12      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ✓ You are fully eligible for MedTrans trips                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                    [Close]      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1: Broker List

- [ ] Shows all brokers for company
- [ ] Shows logo, name, contact, status
- [ ] Shows service area (states)
- [ ] Shows driver count (assigned/eligible)
- [ ] Shows accepted vehicle types
- [ ] Shows credential count
- [ ] Can filter by status
- [ ] Can search by name/contact

### AC-2: Create Broker

- [ ] Required: name, contact name
- [ ] Can set service states
- [ ] Can set accepted vehicle types
- [ ] Can set accepted employment types
- [ ] Can set initial rates per vehicle type
- [ ] Name must be unique per company

### AC-3: Edit Broker

- [ ] Can edit all fields
- [ ] Cannot change name if drivers assigned (or warn)

### AC-4: Broker Status

- [ ] Can activate/deactivate broker
- [ ] Inactive brokers: drivers remain assigned but not eligible for trips
- [ ] Inactive brokers hidden from driver portal "Available Brokers"

### AC-5: Driver Assignment (Admin)

- [ ] Admin can assign drivers to broker
- [ ] Admin can bulk-assign multiple drivers
- [ ] Shows eligibility preview before assigning
- [ ] Can assign ineligible drivers (they see required credentials)
- [ ] Admin can remove drivers from broker
- [ ] Removal preserves history

### AC-6: Driver Requests

- [ ] Driver can request to join available brokers
- [ ] Request shows as "pending" to driver and admin
- [ ] Admin can approve or deny request
- [ ] Driver can cancel pending request
- [ ] Approved request becomes assignment

### AC-7: Eligibility Display

- [ ] Shows clear eligible/ineligible status
- [ ] Ineligible shows specific missing requirements
- [ ] Considers: employment type, state, all credentials, vehicle

### AC-8: Broker Credentials

- [ ] Can view broker-specific credential types
- [ ] Can create credential type scoped to broker
- [ ] Shows completion stats for assigned drivers

### AC-9: Broker Rates

- [ ] Can set base + per-mile rate per vehicle type
- [ ] Rates have effective dates
- [ ] Previous rates preserved for history
- [ ] Used for trip pay calculation

### AC-10: Driver Portal

- [ ] Driver sees assigned brokers with eligibility status
- [ ] Driver sees pending requests
- [ ] Driver sees available brokers to request
- [ ] Driver can view requirements per broker
- [ ] Driver can request to join broker
- [ ] Driver can cancel pending requests

---

## Business Rules

1. **Broker name uniqueness:** Unique per company

2. **Service area:** Drivers outside broker's service states are not eligible

3. **Vehicle types:** Only accepted types count toward eligibility

4. **Employment types:** Driver employment type must be accepted

5. **Assignment states:**
   - `pending` = Driver requested, waiting for admin
   - `assigned` = Active assignment
   - `removed` = Historical, no longer assigned

6. **Eligibility calculation:** Real-time based on current credentials and vehicle status

7. **Deactivation:** Inactive broker = drivers can't take new trips, existing data preserved

8. **Rate history:** When rates change, old rates preserved with effective dates for historical trip calculation

9. **Credential creation:** Broker-specific credentials created separately from broker (AD-005)

---

## API/Queries

### Get Brokers with Stats

```typescript
const { data: brokers } = await supabase
  .from('brokers')
  .select(`
    *,
    driver_assignments:driver_broker_assignments(count),
    credential_types:credential_types(count)
  `)
  .eq('company_id', companyId)
  .order('name');

// Calculate eligibility counts separately (complex query)
for (const broker of brokers) {
  broker.eligible_count = await getEligibleDriverCount(broker.id);
}
```

### Get Broker with Full Details

```typescript
const { data: broker } = await supabase
  .from('brokers')
  .select(`
    *,
    driver_assignments:driver_broker_assignments(
      *,
      driver:drivers(
        *,
        user:users(full_name, email)
      )
    ),
    credential_types:credential_types(*),
    current_rates:broker_rates(*)
  `)
  .eq('id', brokerId)
  .eq('broker_rates.effective_to', null) // Only current rates
  .single();
```

### Assign Driver to Broker

```typescript
async function assignDriverToBroker(
  driverId: string, 
  brokerId: string,
  requestedBy: 'admin' | 'driver'
) {
  const status = requestedBy === 'admin' ? 'assigned' : 'pending';
  
  return supabase
    .from('driver_broker_assignments')
    .insert({
      driver_id: driverId,
      broker_id: brokerId,
      company_id: currentCompanyId,
      status,
      requested_by: requestedBy,
      approved_by: requestedBy === 'admin' ? currentUser.id : null,
      approved_at: requestedBy === 'admin' ? new Date().toISOString() : null,
    });
}
```

### Calculate Driver Eligibility

```typescript
async function getDriverBrokerEligibility(driverId: string, brokerId: string) {
  const driver = await getDriver(driverId);
  const broker = await getBroker(brokerId);
  
  const issues: string[] = [];
  
  // Check employment type
  if (!broker.accepted_employment_types.includes(driver.employment_type)) {
    issues.push(`Employment type (${driver.employment_type}) not accepted`);
  }
  
  // Check service area
  if (!broker.service_states.includes(driver.state)) {
    issues.push(`State (${driver.state}) not in service area`);
  }
  
  // Check global driver credentials
  const missingGlobalDriver = await getMissingCredentials(driverId, 'driver', 'global');
  issues.push(...missingGlobalDriver.map(c => `Missing: ${c.name}`));
  
  // Check broker driver credentials
  const missingBrokerDriver = await getMissingCredentials(driverId, 'driver', brokerId);
  issues.push(...missingBrokerDriver.map(c => `Missing: ${c.name}`));
  
  // Check vehicles
  const vehicles = await getDriverVehicles(driverId);
  const eligibleVehicles = [];
  
  for (const vehicle of vehicles) {
    const vehicleEligibility = await getVehicleBrokerEligibility(vehicle.id, brokerId);
    if (vehicleEligibility.eligible) {
      eligibleVehicles.push(vehicle);
    }
  }
  
  if (eligibleVehicles.length === 0) {
    issues.push('No eligible vehicle');
  }
  
  return {
    eligible: issues.length === 0,
    issues,
    eligibleVehicles,
  };
}
```

### Update Broker Rates

```typescript
async function updateBrokerRates(
  brokerId: string,
  rates: { vehicleType: string; baseRate: number; perMileRate: number }[],
  effectiveFrom: Date
) {
  // Close out current rates
  await supabase
    .from('broker_rates')
    .update({ 
      effective_to: new Date(effectiveFrom.getTime() - 86400000).toISOString() // Day before
    })
    .eq('broker_id', brokerId)
    .is('effective_to', null);
  
  // Insert new rates
  const newRates = rates.map(r => ({
    broker_id: brokerId,
    company_id: currentCompanyId,
    vehicle_type: r.vehicleType,
    base_rate: r.baseRate,
    per_mile_rate: r.perMileRate,
    effective_from: effectiveFrom.toISOString(),
    created_by: currentUser.id,
  }));
  
  return supabase.from('broker_rates').insert(newRates);
}
```

---

## Dependencies

- `02-DATABASE-SCHEMA.md` - Base tables
- AD-002 - Driver Management (drivers tab)
- AD-003 - Vehicle Management (vehicle eligibility)
- AD-005 - Credential Types (broker-specific credentials)

---

## Related Features

- AD-006 - Credential Review (broker credentials shown)
- AD-008 - Trip Manifests (uses broker rates)
- DR-004 - Credential Submission (broker requirements)

---

## Testing Requirements

### Integration Tests

```typescript
describe('AD-007: Broker Management', () => {
  describe('Create Broker', () => {
    it('creates broker with required fields');
    it('enforces unique name per company');
    it('allows same name in different companies');
  });
  
  describe('Driver Assignment', () => {
    it('admin can assign driver directly');
    it('driver can request assignment (pending status)');
    it('admin can approve pending request');
    it('admin can deny pending request');
    it('admin can remove assigned driver');
    it('preserves removal history');
  });
  
  describe('Eligibility Calculation', () => {
    it('eligible when all requirements met');
    it('ineligible when employment type not accepted');
    it('ineligible when state not in service area');
    it('ineligible when missing global credentials');
    it('ineligible when missing broker credentials');
    it('ineligible when no eligible vehicle');
    it('vehicle ineligible when type not accepted');
    it('vehicle ineligible when missing credentials');
  });
  
  describe('Broker Rates', () => {
    it('creates initial rates');
    it('updates rates with new effective date');
    it('preserves rate history');
    it('returns current rates (effective_to is null)');
  });
});
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial spec | - |
