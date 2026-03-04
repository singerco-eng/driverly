# CODEX-044: UX-001 Detail Page Standardization - Implementation Prompts

> **Each user story below is a self-contained task that can be completed by an individual agent.**
> **Reference the context document:** `docs/CODEX-044-UX-001-detail-page-standardization.md`

---

## Prerequisites

Before starting any task:
1. Read the context document: `docs/CODEX-044-UX-001-detail-page-standardization.md`
2. Understand the existing component patterns in referenced files
3. Run `npm run typecheck` after each story to verify no TypeScript errors

---

## User Story 1: UI Component - QuickStatsBar

### Context
Create a reusable component for displaying 3-5 key metrics at a glance with visual status indicators.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md    # Full context - QuickStatsBar section
src/components/ui/stats-grid.tsx                         # Existing stats pattern to follow
src/lib/design-system.ts                                 # cardVariants, textVariants to use
src/components/ui/card.tsx                               # Card primitives
```

### Task
1. Create `src/components/ui/quick-stats-bar.tsx`
2. Export from `src/components/ui/index.ts`

### Component Interface

```typescript
// src/components/ui/quick-stats-bar.tsx

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/lib/design-system';

export interface QuickStat {
  id: string;
  label: string;
  value: string | number;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'neutral';
  description?: string;
  onClick?: () => void;
}

export interface QuickStatsBarProps {
  stats: QuickStat[];
  columns?: 3 | 4 | 5;
  className?: string;
}
```

### Visual Requirements

**Each stat card should have:**
1. Left border accent (4px) colored by status:
   - `success` → `border-l-green-500`
   - `warning` → `border-l-amber-500`
   - `error` → `border-l-destructive`
   - `neutral` → `border-l-muted-foreground/30`
2. Icon in muted circle background (same as StatCard in stats-grid.tsx)
3. Label as muted text (text-sm text-muted-foreground)
4. Value prominently displayed (text-xl font-semibold)
5. Description below value if provided (text-xs text-muted-foreground)

**Layout:**
```tsx
// Grid responsive classes
const gridClasses = {
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-5',
};
```

### Implementation Pattern

**Copy the card structure from `stats-grid.tsx` (lines 21-56) and modify:**

```tsx
export function QuickStatsBar({ stats, columns = 4, className }: QuickStatsBarProps) {
  const gridClass = {
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 lg:grid-cols-5',
  }[columns];

  const statusBorderClass = (status?: QuickStat['status']) => {
    switch (status) {
      case 'success': return 'border-l-4 border-l-green-500';
      case 'warning': return 'border-l-4 border-l-amber-500';
      case 'error': return 'border-l-4 border-l-destructive';
      default: return 'border-l-4 border-l-muted-foreground/30';
    }
  };

  return (
    <div className={cn('grid gap-4', gridClass, className)}>
      {stats.map((stat) => (
        <div
          key={stat.id}
          className={cn(
            cardVariants({ variant: 'stats', padding: 'default' }),
            statusBorderClass(stat.status),
            stat.onClick && 'cursor-pointer hover:shadow-md transition-shadow'
          )}
          onClick={stat.onClick}
          role={stat.onClick ? 'button' : undefined}
          tabIndex={stat.onClick ? 0 : undefined}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-semibold">{stat.value}</p>
              {stat.description && (
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Export Update

**Add to `src/components/ui/index.ts`:**
```typescript
export { QuickStatsBar, type QuickStat, type QuickStatsBarProps } from './quick-stats-bar';
```

### Verification
- [ ] Component renders without errors
- [ ] Status border colors display correctly (test all 4 states)
- [ ] Responsive grid works (2 cols mobile, 4 cols desktop for columns=4)
- [ ] Click handler fires when onClick provided
- [ ] Cursor changes to pointer when onClick provided
- [ ] Icon displays in muted circle background
- [ ] No TypeScript errors

---

## User Story 2: UI Component - InfoSection

### Context
Create a reusable section wrapper for grouped information with optional edit capability.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md    # Full context - InfoSection section
src/components/ui/card.tsx                               # Card primitives to use
src/pages/driver/Profile.tsx                             # Section card pattern (lines 181-208)
src/components/ui/accordion.tsx                          # Collapsible pattern if needed
```

### Task
1. Create `src/components/ui/info-section.tsx`
2. Export from `src/components/ui/index.ts`

### Component Interface

```typescript
// src/components/ui/info-section.tsx

import * as React from 'react';

export interface InfoSectionProps {
  id?: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  onEdit?: () => void;
  canEdit?: boolean;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}
```

### Implementation Pattern

**Copy the section card pattern from `Profile.tsx` (lines 181-208):**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cardVariants } from '@/lib/design-system';

export interface InfoSectionProps {
  id?: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  onEdit?: () => void;
  canEdit?: boolean;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export function InfoSection({
  id,
  icon,
  title,
  description,
  onEdit,
  canEdit = true,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
}: InfoSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const header = (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
      <div className="space-y-1">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onEdit && canEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
        {collapsible && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </Button>
        )}
      </div>
    </CardHeader>
  );

  const content = (
    <CardContent className="pt-0">
      {children}
    </CardContent>
  );

  if (collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card id={id} className={cn(cardVariants({ variant: 'default' }), className)}>
          <CollapsibleTrigger asChild>
            {header}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {content}
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card id={id} className={cn(cardVariants({ variant: 'default' }), className)}>
      {header}
      {content}
    </Card>
  );
}
```

### Export Update

**Add to `src/components/ui/index.ts`:**
```typescript
export { InfoSection, type InfoSectionProps } from './info-section';
```

### Verification
- [ ] Component renders with title
- [ ] Icon displays next to title when provided
- [ ] Description displays below title when provided
- [ ] Edit button shows when onEdit AND canEdit are provided
- [ ] Edit button hidden when canEdit is false
- [ ] Collapsible mode works (expand/collapse)
- [ ] Chevron rotates when collapsed/expanded
- [ ] Children render in CardContent
- [ ] No TypeScript errors

---

## User Story 3: UI Component - PropertyGrid

### Context
Create a structured key-value grid display for entity properties.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md    # Full context - PropertyGrid section
src/pages/driver/Profile.tsx                             # Key-value display patterns (lines 270-282)
src/components/features/driver/VehicleDetailsTab.tsx     # Grid layout pattern
```

### Task
1. Create `src/components/ui/property-grid.tsx`
2. Export from `src/components/ui/index.ts`

### Component Interface

```typescript
// src/components/ui/property-grid.tsx

import * as React from 'react';

export interface Property {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2;
  hidden?: boolean;
}

export interface PropertyGridProps {
  properties: Property[];
  columns?: 1 | 2 | 3;
  className?: string;
}
```

### Implementation Pattern

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Property {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2;
  hidden?: boolean;
}

export interface PropertyGridProps {
  properties: Property[];
  columns?: 1 | 2 | 3;
  className?: string;
}

export function PropertyGrid({ properties, columns = 2, className }: PropertyGridProps) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }[columns];

  const visibleProperties = properties.filter((p) => !p.hidden);

  return (
    <div className={cn('grid gap-x-6 gap-y-4', gridClass, className)}>
      {visibleProperties.map((property, index) => (
        <div
          key={`${property.label}-${index}`}
          className={cn(
            'space-y-1',
            property.span === 2 && 'sm:col-span-2'
          )}
        >
          <dt className="text-sm text-muted-foreground">{property.label}</dt>
          <dd className="text-sm font-medium">
            {property.value ?? <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
      ))}
    </div>
  );
}
```

### Usage Example

```tsx
<PropertyGrid
  properties={[
    { label: 'Full Name', value: driver.user?.full_name },
    { label: 'Date of Birth', value: formatDate(driver.date_of_birth) },
    { label: 'SSN', value: '****-****-1234' },
    { label: 'Address', value: fullAddress, span: 2 },
    { label: 'Hidden Field', value: 'secret', hidden: !isAdmin },
  ]}
  columns={2}
/>
```

### Export Update

**Add to `src/components/ui/index.ts`:**
```typescript
export { PropertyGrid, type Property, type PropertyGridProps } from './property-grid';
```

### Verification
- [ ] Renders grid with correct columns
- [ ] Labels display as muted text
- [ ] Values display as medium weight text
- [ ] Span=2 properties take full width
- [ ] Hidden properties are not rendered
- [ ] Empty/null values show em-dash (—)
- [ ] Responsive layout works
- [ ] No TypeScript errors

---

## User Story 4: DriverSummaryTab - Core Structure

### Context
Create the main driver summary tab component that consolidates Overview and Profile content.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md    # Full context - DriverSummaryTab section
src/components/features/admin/DriverOverviewTab.tsx      # Current overview content to merge
src/pages/driver/Profile.tsx                             # Profile sections to merge
src/components/ui/quick-stats-bar.tsx                    # Component from Story 1
src/components/ui/info-section.tsx                       # Component from Story 2
src/components/ui/property-grid.tsx                      # Component from Story 3
src/contexts/AuthContext.tsx                             # useAuth for role detection
```

### Task
1. Create `src/components/features/shared/` directory if it doesn't exist
2. Create `src/components/features/shared/DriverSummaryTab.tsx`
3. Include QuickStatsBar and first 3 InfoSections (Personal, Contact, Address)

### Component Interface

```typescript
// src/components/features/shared/DriverSummaryTab.tsx

import type { DriverWithDetails } from '@/types/driver';

export interface DriverSummaryTabProps {
  driver: DriverWithDetails;
  companyId: string;
  canEdit?: boolean;
}
```

### Implementation Structure

```tsx
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickStatsBar, type QuickStat } from '@/components/ui/quick-stats-bar';
import { InfoSection } from '@/components/ui/info-section';
import { PropertyGrid } from '@/components/ui/property-grid';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  FileCheck, 
  AlertTriangle, 
  Car, 
  Calendar,
  User,
  Mail,
  MapPin,
} from 'lucide-react';

// Import edit modals from driver features
import EditPersonalInfoModal from '@/components/features/driver/EditPersonalInfoModal';
import EditContactInfoModal from '@/components/features/driver/EditContactInfoModal';
import EditAddressModal from '@/components/features/driver/EditAddressModal';

import type { DriverWithDetails } from '@/types/driver';

export interface DriverSummaryTabProps {
  driver: DriverWithDetails;
  companyId: string;
  canEdit?: boolean;
}

export function DriverSummaryTab({ driver, companyId, canEdit = true }: DriverSummaryTabProps) {
  const { user } = useAuth();
  
  // Role detection
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isOwner = user?.id === driver.user_id;
  const effectiveCanEdit = canEdit && (isAdmin || isOwner);

  // Modal states
  const [showPersonal, setShowPersonal] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  // Compute quick stats
  const quickStats = useMemo<QuickStat[]>(() => {
    // License status
    const licenseExpiration = driver.license_expiration 
      ? new Date(driver.license_expiration) 
      : null;
    const daysUntilExpiry = licenseExpiration 
      ? Math.ceil((licenseExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    
    let licenseStatus: QuickStat['status'] = 'neutral';
    let licenseValue = 'Not provided';
    if (daysUntilExpiry !== null) {
      if (daysUntilExpiry < 0) {
        licenseStatus = 'error';
        licenseValue = 'Expired';
      } else if (daysUntilExpiry <= 90) {
        licenseStatus = 'warning';
        licenseValue = `Expires in ${daysUntilExpiry}d`;
      } else {
        licenseStatus = 'success';
        licenseValue = licenseExpiration!.toLocaleDateString();
      }
    }

    return [
      {
        id: 'license',
        label: 'License',
        value: licenseValue,
        icon: <FileCheck className="w-5 h-5 text-primary" />,
        status: licenseStatus,
        description: driver.license_state || undefined,
      },
      {
        id: 'vehicles',
        label: 'Vehicles',
        value: driver.vehicle_count ?? 0,
        icon: <Car className="w-5 h-5 text-primary" />,
        status: 'neutral',
        description: 'Assigned vehicles',
      },
      {
        id: 'credentials',
        label: 'Credentials',
        value: `${driver.credentials_complete ?? 0}/${driver.credentials_total ?? 0}`,
        icon: <FileCheck className="w-5 h-5 text-primary" />,
        status: driver.credentials_complete === driver.credentials_total ? 'success' : 'warning',
        description: 'Complete',
      },
      {
        id: 'activity',
        label: 'Last Active',
        value: driver.last_active_at 
          ? new Date(driver.last_active_at).toLocaleDateString() 
          : 'Never',
        icon: <Calendar className="w-5 h-5 text-primary" />,
        status: 'neutral',
      },
    ];
  }, [driver]);

  // Format address
  const fullAddress = [
    driver.address_line1,
    driver.address_line2,
    [driver.city, driver.state, driver.zip].filter(Boolean).join(', '),
  ].filter(Boolean).join('\n');

  return (
    <div className="space-y-6">
      {/* Quick Stats Bar */}
      <QuickStatsBar stats={quickStats} columns={4} />

      {/* Personal Information Section */}
      <InfoSection
        id="personal"
        icon={<User className="w-4 h-4" />}
        title="Personal Information"
        description="Basic details about the driver"
        onEdit={() => setShowPersonal(true)}
        canEdit={effectiveCanEdit}
      >
        <div className="flex items-start gap-4">
          <Avatar size="lg">
            {driver.user?.avatar_url && (
              <AvatarImage src={driver.user.avatar_url} alt={driver.user.full_name} />
            )}
            <AvatarFallback>
              {driver.user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DR'}
            </AvatarFallback>
          </Avatar>
          <PropertyGrid
            properties={[
              { label: 'Full Name', value: driver.user?.full_name },
              { 
                label: 'Date of Birth', 
                value: driver.date_of_birth 
                  ? new Date(driver.date_of_birth).toLocaleDateString() 
                  : null 
              },
              { 
                label: 'SSN', 
                value: driver.ssn_last_four ? `****-****-${driver.ssn_last_four}` : null,
                hidden: !isAdmin && !isOwner, // Only show to admin or owner
              },
            ]}
            columns={2}
          />
        </div>
      </InfoSection>

      {/* Contact Information Section */}
      <InfoSection
        id="contact"
        icon={<Mail className="w-4 h-4" />}
        title="Contact Information"
        description="Email and phone details"
        onEdit={() => setShowContact(true)}
        canEdit={effectiveCanEdit}
      >
        <PropertyGrid
          properties={[
            { 
              label: 'Email', 
              value: (
                <span className="flex items-center gap-2">
                  {driver.user?.email}
                  {driver.user?.email_confirmed_at && (
                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                  )}
                </span>
              ),
            },
            { label: 'Phone', value: driver.user?.phone },
          ]}
          columns={2}
        />
      </InfoSection>

      {/* Address Section */}
      <InfoSection
        id="address"
        icon={<MapPin className="w-4 h-4" />}
        title="Address"
        description="Current home address"
        onEdit={() => setShowAddress(true)}
        canEdit={effectiveCanEdit}
      >
        <PropertyGrid
          properties={[
            { label: 'Street Address', value: driver.address_line1 },
            { label: 'Address Line 2', value: driver.address_line2, hidden: !driver.address_line2 },
            { label: 'City', value: driver.city },
            { label: 'State', value: driver.state },
            { label: 'ZIP Code', value: driver.zip },
          ]}
          columns={3}
        />
      </InfoSection>

      {/* Edit Modals */}
      <EditPersonalInfoModal
        open={showPersonal}
        onOpenChange={setShowPersonal}
        driver={driver}
        user={driver.user}
      />
      <EditContactInfoModal
        open={showContact}
        onOpenChange={setShowContact}
        driver={driver}
        user={driver.user}
      />
      <EditAddressModal
        open={showAddress}
        onOpenChange={setShowAddress}
        driver={driver}
      />
    </div>
  );
}
```

### Notes
- This is a partial implementation. Additional sections (License, Employment, Emergency Contact, Notes) will be added in Story 5.
- The `driver.vehicle_count`, `driver.credentials_complete`, `driver.credentials_total` fields may need to be computed or fetched separately. Check `DriverWithDetails` type.
- Avatar URL resolution may need the `resolveAvatarUrl` utility from `src/services/profile.ts`.

### Verification
- [ ] Component renders without errors
- [ ] QuickStatsBar displays 4 stats
- [ ] Personal section shows avatar, name, DOB
- [ ] SSN shows masked value only to admin/owner
- [ ] Contact section shows email with verified badge if applicable
- [ ] Address section shows all address fields
- [ ] Edit buttons appear when user has permission
- [ ] Edit modals open when buttons clicked
- [ ] No TypeScript errors

---

## User Story 5: DriverSummaryTab - Additional Sections

### Context
Complete the DriverSummaryTab with remaining sections: License, Employment, Emergency Contact, and Notes.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md    # Full context
src/components/features/shared/DriverSummaryTab.tsx      # Component from Story 4
src/pages/driver/Profile.tsx                             # License section (lines 257-308)
src/components/features/admin/DriverNotesSection.tsx     # Notes section to include
src/components/features/driver/EditLicenseModal.tsx      # License edit modal
src/components/features/driver/EditEmergencyContactModal.tsx  # Emergency contact modal
src/hooks/useLocations.ts                                # Location selector hooks
```

### Task
1. Add License Details section with photo thumbnails
2. Add Employment section with location selector
3. Add Emergency Contact section
4. Add Notes section (admin-only)

### Sections to Add

**License Details Section:**
```tsx
import { ShieldCheck } from 'lucide-react';
import EditLicenseModal from '@/components/features/driver/EditLicenseModal';

// Add state
const [showLicense, setShowLicense] = useState(false);
const [frontPreview, setFrontPreview] = useState<string | null>(null);
const [backPreview, setBackPreview] = useState<string | null>(null);

// Add effect for license photo resolution (copy from Profile.tsx lines 51-67)
useEffect(() => {
  let isMounted = true;
  async function loadPreviews() {
    if (!driver) return;
    if (driver.license_front_url) {
      const { data } = await supabase.storage
        .from('credential-documents')
        .createSignedUrl(driver.license_front_url, 60 * 60);
      if (isMounted) setFrontPreview(data?.signedUrl || null);
    }
    if (driver.license_back_url) {
      const { data } = await supabase.storage
        .from('credential-documents')
        .createSignedUrl(driver.license_back_url, 60 * 60);
      if (isMounted) setBackPreview(data?.signedUrl || null);
    }
  }
  void loadPreviews();
  return () => { isMounted = false; };
}, [driver.license_front_url, driver.license_back_url]);

// Section JSX
<InfoSection
  id="license"
  icon={<ShieldCheck className="w-4 h-4" />}
  title="License Details"
  description="Driver's license information and photos"
  onEdit={() => setShowLicense(true)}
  canEdit={effectiveCanEdit}
>
  <div className="space-y-4">
    <PropertyGrid
      properties={[
        { label: 'License Number', value: driver.license_number },
        { label: 'State', value: driver.license_state },
        { 
          label: 'Expiration', 
          value: driver.license_expiration 
            ? new Date(driver.license_expiration).toLocaleDateString() 
            : null 
        },
      ]}
      columns={3}
    />
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Front</p>
        <div className="h-32 rounded-md border bg-muted/10 flex items-center justify-center overflow-hidden">
          {frontPreview ? (
            <img src={frontPreview} alt="License front" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">Not uploaded</span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Back</p>
        <div className="h-32 rounded-md border bg-muted/10 flex items-center justify-center overflow-hidden">
          {backPreview ? (
            <img src={backPreview} alt="License back" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">Not uploaded</span>
          )}
        </div>
      </div>
    </div>
  </div>
</InfoSection>

<EditLicenseModal open={showLicense} onOpenChange={setShowLicense} driver={driver} />
```

**Employment Section with Location Selector:**
```tsx
import { Briefcase } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocations, useAssignDriverToLocation } from '@/hooks/useLocations';

// Add hook calls inside component
const { data: locations } = useLocations(companyId);
const assignToLocation = useAssignDriverToLocation();
const activeLocations = (locations ?? []).filter((l) => l.status === 'active');

// Section JSX (no edit modal - inline location selector)
<InfoSection
  id="employment"
  icon={<Briefcase className="w-4 h-4" />}
  title="Employment"
  description="Employment type and location assignment"
  canEdit={false}  // No edit button - uses inline controls
>
  <div className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">Employment Type</p>
      <p className="text-sm font-medium">{driver.employment_type?.toUpperCase() || '—'}</p>
    </div>
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">Start Date</p>
      <p className="text-sm font-medium">
        {driver.approved_at 
          ? new Date(driver.approved_at).toLocaleDateString()
          : driver.created_at 
            ? new Date(driver.created_at).toLocaleDateString()
            : '—'
        }
      </p>
    </div>
    <div className="space-y-1 sm:col-span-2">
      <p className="text-sm text-muted-foreground">Location Assignment</p>
      {isAdmin ? (
        <Select
          value={driver.location_id || 'unassigned'}
          onValueChange={(value) => {
            assignToLocation.mutate({
              driverId: driver.id,
              locationId: value === 'unassigned' ? null : value,
            });
          }}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {activeLocations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name} {location.code ? `(${location.code})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-sm font-medium">{driver.location?.name || 'Unassigned'}</p>
      )}
    </div>
  </div>
</InfoSection>
```

**Emergency Contact Section:**
```tsx
import { Phone } from 'lucide-react';
import EditEmergencyContactModal from '@/components/features/driver/EditEmergencyContactModal';

// Add state
const [showEmergency, setShowEmergency] = useState(false);

const hasEmergency = !!(
  driver.emergency_contact_name || 
  driver.emergency_contact_phone || 
  driver.emergency_contact_relation
);

// Section JSX
<InfoSection
  id="emergency"
  icon={<Phone className="w-4 h-4" />}
  title="Emergency Contact"
  description="Contact in case of emergency"
  onEdit={() => setShowEmergency(true)}
  canEdit={effectiveCanEdit}
>
  {hasEmergency ? (
    <PropertyGrid
      properties={[
        { label: 'Name', value: driver.emergency_contact_name },
        { label: 'Phone', value: driver.emergency_contact_phone },
        { label: 'Relationship', value: driver.emergency_contact_relation },
      ]}
      columns={3}
    />
  ) : (
    <p className="text-sm text-muted-foreground">No emergency contact on file</p>
  )}
</InfoSection>

<EditEmergencyContactModal open={showEmergency} onOpenChange={setShowEmergency} driver={driver} />
```

**Notes Section (Admin Only):**
```tsx
import { DriverNotesSection } from '@/components/features/admin/DriverNotesSection';

// Only render for admins
{isAdmin && (
  <DriverNotesSection driverId={driver.id} canEdit={effectiveCanEdit} />
)}
```

### Verification
- [ ] License section shows number, state, expiration
- [ ] License photos display when available
- [ ] Employment section shows type and start date
- [ ] Location selector appears for admins only
- [ ] Location selector updates driver assignment
- [ ] Emergency contact section shows info when available
- [ ] Emergency contact shows placeholder when empty
- [ ] Notes section appears for admins only
- [ ] All edit modals function correctly
- [ ] No TypeScript errors

---

## User Story 6: Integrate DriverSummaryTab - Admin Portal

### Context
Replace the existing Overview and Profile tabs in admin DriverDetail page with the new DriverSummaryTab.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md
src/pages/admin/DriverDetail.tsx                         # Page to update
src/components/features/shared/DriverSummaryTab.tsx      # Component from Stories 4-5
```

### Task
1. Update `src/pages/admin/DriverDetail.tsx` to use DriverSummaryTab
2. Remove Overview and Profile tabs, replace with single Summary tab
3. Update tab default value

### Changes to DriverDetail.tsx

**Find the imports section and add:**
```tsx
import { DriverSummaryTab } from '@/components/features/shared/DriverSummaryTab';
```

**Find the TabsList (around line 216-228) and update:**
```tsx
// BEFORE:
<TabsList>
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="profile">Profile</TabsTrigger>
  <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
  <TabsTrigger value="credentials">Credentials</TabsTrigger>
  <TabsTrigger value="availability" disabled>Availability</TabsTrigger>
</TabsList>

// AFTER:
<TabsList>
  <TabsTrigger value="summary">Summary</TabsTrigger>
  <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
  <TabsTrigger value="credentials">Credentials</TabsTrigger>
  <TabsTrigger value="availability" disabled>Availability</TabsTrigger>
</TabsList>
```

**Find the Tabs defaultValue and update:**
```tsx
// BEFORE:
<Tabs defaultValue="overview">

// AFTER:
<Tabs defaultValue="summary">
```

**Find the TabsContent sections (around line 231-245) and update:**
```tsx
// REMOVE these TabsContent blocks:
<TabsContent value="overview" className="mt-0">
  <DriverOverviewTab driver={driver} canEdit={isAdmin} />
</TabsContent>
<TabsContent value="profile" className="mt-0">
  {/* Profile tab content */}
</TabsContent>

// REPLACE with:
<TabsContent value="summary" className="mt-0">
  <DriverSummaryTab 
    driver={driver} 
    companyId={driver.company_id} 
    canEdit={isAdmin} 
  />
</TabsContent>
```

**Remove the old import (if present):**
```tsx
// REMOVE:
import { DriverOverviewTab } from '@/components/features/admin/DriverOverviewTab';
```

### Verification
- [ ] DriverDetail page loads without errors
- [ ] "Summary" tab is selected by default
- [ ] DriverSummaryTab content displays correctly
- [ ] All QuickStats display correct values
- [ ] All InfoSections render with edit buttons
- [ ] Edit modals work for all sections
- [ ] Location selector works (admin)
- [ ] Notes section appears
- [ ] Other tabs (Vehicles, Credentials) still work
- [ ] No TypeScript errors

---

## User Story 7: Integrate DriverSummaryTab - Driver Portal

### Context
Update the driver Profile page to use the shared DriverSummaryTab instead of its inline sections.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md
src/pages/driver/Profile.tsx                             # Page to update
src/components/features/shared/DriverSummaryTab.tsx      # Component to use
```

### Task
1. Update `src/pages/driver/Profile.tsx` to use DriverSummaryTab
2. Remove inline section cards and edit modals (they're now in DriverSummaryTab)
3. Keep the profile completion banner if incomplete

### Changes to Profile.tsx

**The page should be dramatically simplified:**

```tsx
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverProfile, useProfileCompletion } from '@/hooks/useProfile';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { DriverSummaryTab } from '@/components/features/shared/DriverSummaryTab';

export default function DriverProfile() {
  const { user } = useAuth();
  const { data: driver, isLoading } = useDriverProfile(user?.id);
  const completion = driver ? useProfileCompletion(driver) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <h1 className="text-xl font-bold">Driver Profile</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <Card className={cn(cardVariants({ variant: 'glass' }), 'p-6 text-center text-muted-foreground')}>
              We couldn't find your driver profile yet.
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (driver.application_status !== 'approved') {
    return <Navigate to="/driver/application-status" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width header */}
      <div className="border-b bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold">Driver Profile</h1>
              <p className="text-sm text-muted-foreground">
                Review and update your personal information and documents.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Profile completion banner - keep this */}
          {completion && !completion.isComplete && (
            <Card className={cn(cardVariants({ variant: 'stats' }))}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Profile Completion</CardTitle>
                  <Badge variant={completion.isComplete ? 'secondary' : 'outline'}>
                    {completion.percentage}% Complete
                  </Badge>
                </div>
                <CardDescription>
                  Complete all sections to unlock the best broker opportunities.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={completion.percentage} className="h-2" />
                {completion.missingFields.length > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Missing: {completion.missingFields.slice(0, 4).join(', ')}
                    {completion.missingFields.length > 4 && ` +${completion.missingFields.length - 4} more`}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">All required fields are complete.</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Use DriverSummaryTab for all content */}
          <DriverSummaryTab 
            driver={driver} 
            companyId={driver.company_id} 
            canEdit={true}  // Driver can edit their own profile
          />
        </div>
      </div>
    </div>
  );
}
```

### Key Changes
1. Remove all inline section Cards (Personal, Contact, Address, License, Employment, Emergency)
2. Remove all edit modal state variables and modals (they're now in DriverSummaryTab)
3. Remove avatar URL resolution (moved to DriverSummaryTab)
4. Remove license photo preview state and loading (moved to DriverSummaryTab)
5. Keep the profile completion banner
6. Import and use DriverSummaryTab

### Verification
- [ ] Profile page loads without errors
- [ ] Profile completion banner still shows when incomplete
- [ ] All sections display via DriverSummaryTab
- [ ] QuickStatsBar displays at top
- [ ] All edit modals work
- [ ] Location selector shows read-only location (drivers can't change)
- [ ] Notes section does NOT appear (driver view)
- [ ] No TypeScript errors

---

## User Story 8: VehicleSummaryTab - Core Structure

### Context
Create the vehicle summary tab component that consolidates Overview and Details content.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md    # Full context - VehicleSummaryTab section
src/components/features/admin/VehicleOverviewTab.tsx     # Current admin overview
src/components/features/driver/VehicleOverviewTab.tsx    # Current driver overview
src/components/features/driver/VehicleDetailsTab.tsx     # Details tab content
src/components/ui/quick-stats-bar.tsx                    # Component from Story 1
src/components/ui/info-section.tsx                       # Component from Story 2
src/components/ui/property-grid.tsx                      # Component from Story 3
```

### Task
1. Create `src/components/features/shared/VehicleSummaryTab.tsx`
2. Include QuickStatsBar and all InfoSections

### Component Interface

```typescript
// src/components/features/shared/VehicleSummaryTab.tsx

import type { VehicleWithAssignments } from '@/types/vehicle';
import type { Driver } from '@/types/driver';

export interface VehicleSummaryTabProps {
  vehicle: VehicleWithAssignments;
  companyId: string;
  driver?: Driver | null;  // For driver portal context
  canEdit?: boolean;
  isDriverView?: boolean;  // True when viewed from driver portal
  onUpdatePhotos?: () => void;
}
```

### Implementation Structure

```tsx
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickStatsBar, type QuickStat } from '@/components/ui/quick-stats-bar';
import { InfoSection } from '@/components/ui/info-section';
import { PropertyGrid } from '@/components/ui/property-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Car, 
  FileCheck, 
  Users,
  Gauge,
  Camera,
  Building2,
  Star,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

import { useLocations, useAssignVehicleToLocation } from '@/hooks/useLocations';
import { useUpdateVehicleMileage } from '@/hooks/useVehicles';
import { useBrokers } from '@/hooks/useBrokers';
import { vehicleStatusVariant } from '@/lib/status-styles';
import { resolveVehiclePhotoUrl } from '@/lib/vehiclePhoto';

import type { VehicleWithAssignments, VehicleStatus } from '@/types/vehicle';
import type { Driver } from '@/types/driver';

export interface VehicleSummaryTabProps {
  vehicle: VehicleWithAssignments;
  companyId: string;
  driver?: Driver | null;
  canEdit?: boolean;
  isDriverView?: boolean;
  onUpdatePhotos?: () => void;
}

export function VehicleSummaryTab({
  vehicle,
  companyId,
  driver,
  canEdit = true,
  isDriverView = false,
  onUpdatePhotos,
}: VehicleSummaryTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  
  const { data: locations } = useLocations(companyId);
  const assignToLocation = useAssignVehicleToLocation();
  const updateMileage = useUpdateVehicleMileage();
  
  const activeLocations = (locations ?? []).filter((l) => l.status === 'active');
  const [mileageValue, setMileageValue] = useState(
    vehicle.mileage !== null ? String(vehicle.mileage) : ''
  );

  const isCompanyVehicle = vehicle.ownership === 'company';

  // Photo state
  const [exteriorUrl, setExteriorUrl] = useState<string | null>(null);
  const [interiorUrl, setInteriorUrl] = useState<string | null>(null);
  const [liftUrl, setLiftUrl] = useState<string | null>(null);
  const [photosLoading, setPhotosLoading] = useState(true);

  // Load photos
  useEffect(() => {
    let mounted = true;
    const loadPhotos = async () => {
      const [ext, int, lift] = await Promise.all([
        vehicle.exterior_photo_url ? resolveVehiclePhotoUrl(vehicle.exterior_photo_url) : null,
        vehicle.interior_photo_url ? resolveVehiclePhotoUrl(vehicle.interior_photo_url) : null,
        vehicle.wheelchair_lift_photo_url ? resolveVehiclePhotoUrl(vehicle.wheelchair_lift_photo_url) : null,
      ]);
      if (mounted) {
        setExteriorUrl(ext);
        setInteriorUrl(int);
        setLiftUrl(lift);
        setPhotosLoading(false);
      }
    };
    void loadPhotos();
    return () => { mounted = false; };
  }, [vehicle.exterior_photo_url, vehicle.interior_photo_url, vehicle.wheelchair_lift_photo_url]);

  // Quick stats
  const quickStats = useMemo<QuickStat[]>(() => {
    return [
      {
        id: 'status',
        label: 'Status',
        value: vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1),
        icon: <Car className="w-5 h-5 text-primary" />,
        status: vehicle.status === 'active' ? 'success' : 
                vehicle.status === 'inactive' ? 'warning' : 'neutral',
      },
      {
        id: 'assignment',
        label: 'Assignment',
        value: vehicle.assignments?.[0]?.is_primary ? 'Primary' : 
               vehicle.assignments?.length ? 'Secondary' : 'Unassigned',
        icon: <Users className="w-5 h-5 text-primary" />,
        status: vehicle.assignments?.length ? 'success' : 'neutral',
        description: vehicle.assignments?.[0]?.driver?.user?.full_name,
      },
      {
        id: 'capacity',
        label: 'Capacity',
        value: `${vehicle.seat_capacity} seats`,
        icon: <Users className="w-5 h-5 text-primary" />,
        status: 'neutral',
        description: vehicle.vehicle_type === 'wheelchair_van' 
          ? `${vehicle.wheelchair_capacity} WC` 
          : undefined,
      },
      {
        id: 'credentials',
        label: 'Credentials',
        value: `${vehicle.credentials_complete ?? 0}/${vehicle.credentials_total ?? 0}`,
        icon: <FileCheck className="w-5 h-5 text-primary" />,
        status: vehicle.credentials_complete === vehicle.credentials_total ? 'success' : 'warning',
        description: 'Complete',
      },
    ];
  }, [vehicle]);

  const handleUpdateMileage = async () => {
    const mileage = Number(mileageValue);
    if (Number.isNaN(mileage)) return;
    await updateMileage.mutateAsync({ vehicleId: vehicle.id, mileage });
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats Bar */}
      <QuickStatsBar stats={quickStats} columns={4} />

      {/* Vehicle Information Section */}
      <InfoSection
        id="vehicle-info"
        icon={<Car className="w-4 h-4" />}
        title="Vehicle Information"
        description="Make, model, and basic details"
        canEdit={false}  // Edit via main edit modal
      >
        <PropertyGrid
          properties={[
            { label: 'Make', value: vehicle.make },
            { label: 'Model', value: vehicle.model },
            { label: 'Year', value: vehicle.year },
            { label: 'Color', value: vehicle.color },
            { label: 'Type', value: vehicle.vehicle_type?.replace('_', ' ') },
            { label: 'Fleet #', value: vehicle.fleet_number, hidden: !vehicle.fleet_number },
          ]}
          columns={3}
        />
      </InfoSection>

      {/* Identification Section */}
      <InfoSection
        id="identification"
        icon={<FileCheck className="w-4 h-4" />}
        title="Identification"
        description="License plate and VIN"
        canEdit={false}
      >
        <PropertyGrid
          properties={[
            { label: 'License Plate', value: vehicle.license_plate },
            { label: 'State', value: vehicle.license_state },
            { label: 'VIN', value: vehicle.vin },
          ]}
          columns={3}
        />
      </InfoSection>

      {/* Capacity Section */}
      <InfoSection
        id="capacity"
        icon={<Users className="w-4 h-4" />}
        title="Capacity"
        description="Passenger and accessibility capacity"
        canEdit={false}
      >
        <PropertyGrid
          properties={[
            { label: 'Seat Capacity', value: vehicle.seat_capacity },
            { 
              label: 'Wheelchair Capacity', 
              value: vehicle.wheelchair_capacity,
              hidden: vehicle.vehicle_type !== 'wheelchair_van',
            },
            { 
              label: 'Stretcher Capacity', 
              value: vehicle.stretcher_capacity,
              hidden: vehicle.vehicle_type !== 'stretcher_van',
            },
          ]}
          columns={3}
        />
      </InfoSection>

      {/* Photos Section */}
      <InfoSection
        id="photos"
        icon={<Camera className="w-4 h-4" />}
        title="Photos"
        description="Vehicle exterior, interior, and equipment photos"
        onEdit={onUpdatePhotos}
        canEdit={canEdit}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Exterior', url: exteriorUrl },
            { label: 'Interior', url: interiorUrl },
            ...(vehicle.vehicle_type === 'wheelchair_van' 
              ? [{ label: 'Lift', url: liftUrl }] 
              : []
            ),
          ].map((photo) => (
            <div key={photo.label} className="space-y-2">
              <p className="text-xs text-muted-foreground">{photo.label}</p>
              <div className="h-32 rounded-md border bg-muted/20 flex items-center justify-center overflow-hidden">
                {photosLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : photo.url ? (
                  <img src={photo.url} alt={photo.label} className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>
      </InfoSection>

      {/* Ownership Section - Admin Only */}
      {isAdmin && !isDriverView && (
        <InfoSection
          id="ownership"
          icon={<Building2 className="w-4 h-4" />}
          title="Ownership & Assignment"
          description="Ownership type and location assignment"
          canEdit={false}
        >
          <div className="space-y-4">
            <PropertyGrid
              properties={[
                { label: 'Ownership Type', value: vehicle.ownership?.charAt(0).toUpperCase() + vehicle.ownership?.slice(1) },
                { label: 'Owner', value: vehicle.owner?.user?.full_name, hidden: vehicle.ownership === 'company' },
              ]}
              columns={2}
            />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Location Assignment</p>
              <Select
                value={vehicle.location_id || 'unassigned'}
                onValueChange={(value) => {
                  assignToLocation.mutate({
                    vehicleId: vehicle.id,
                    locationId: value === 'unassigned' ? null : value,
                  });
                }}
                disabled={!canEdit}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {activeLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} {location.code ? `(${location.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </InfoSection>
      )}

      {/* Mileage Section - Company Vehicles Only, Admin Only */}
      {isCompanyVehicle && isAdmin && !isDriverView && (
        <InfoSection
          id="mileage"
          icon={<Gauge className="w-4 h-4" />}
          title="Mileage"
          description="Current odometer reading"
          canEdit={false}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={mileageValue}
              onChange={(e) => setMileageValue(e.target.value)}
              placeholder="Enter mileage"
              className="sm:max-w-[200px]"
              disabled={!canEdit}
            />
            <Button
              onClick={handleUpdateMileage}
              disabled={!canEdit || updateMileage.isPending || !mileageValue.trim()}
              size="sm"
            >
              {updateMileage.isPending ? 'Updating...' : 'Update'}
            </Button>
            {vehicle.mileage_updated_at && (
              <span className="text-xs text-muted-foreground">
                Last updated: {new Date(vehicle.mileage_updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </InfoSection>
      )}

      {/* Broker Eligibility - Driver View Only */}
      {isDriverView && <BrokerEligibilitySection vehicle={vehicle} driver={driver} companyId={companyId} />}
    </div>
  );
}

// Separate component for broker eligibility (driver view only)
function BrokerEligibilitySection({ 
  vehicle, 
  driver, 
  companyId 
}: { 
  vehicle: VehicleWithAssignments; 
  driver?: Driver | null;
  companyId: string;
}) {
  const { data: brokers = [] } = useBrokers(companyId);
  // Note: You may need to add credential checking logic here
  // This is simplified - copy full logic from driver/VehicleOverviewTab.tsx

  const activeBrokers = brokers.filter((b) => b.status === 'active' && b.is_active !== false);

  return (
    <InfoSection
      id="broker-eligibility"
      icon={<Building2 className="w-4 h-4" />}
      title="Broker Eligibility"
      description="Which trip sources this vehicle qualifies for"
      canEdit={false}
    >
      {activeBrokers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No brokers configured yet.</p>
      ) : (
        <div className="space-y-2">
          {activeBrokers.map((broker) => (
            <div key={broker.id} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {broker.name}
            </div>
          ))}
        </div>
      )}
    </InfoSection>
  );
}
```

### Notes
- The `vehicle.credentials_complete` and `vehicle.credentials_total` fields may need to be computed. Check if these exist on `VehicleWithAssignments` or need to be fetched separately.
- The BrokerEligibilitySection is simplified. For full eligibility logic, copy from `src/components/features/driver/VehicleOverviewTab.tsx` (lines 44-81).
- Photo URL resolution uses `resolveVehiclePhotoUrl` from `src/lib/vehiclePhoto.ts`.

### Verification
- [ ] Component renders without errors
- [ ] QuickStatsBar displays 4 stats with correct values
- [ ] Vehicle Information section shows make/model/year/color/type
- [ ] Identification section shows plate/state/VIN
- [ ] Capacity section shows seats and WC/stretcher if applicable
- [ ] Photos section displays images when available
- [ ] Photos section shows placeholder when images missing
- [ ] Ownership section appears for admin only
- [ ] Location selector works in admin view
- [ ] Mileage section appears for company vehicles in admin view
- [ ] Broker eligibility appears in driver view only
- [ ] No TypeScript errors

---

## User Story 9: Integrate VehicleSummaryTab - Admin Portal

### Context
Replace the existing Overview and Details tabs in admin VehicleDetail page with the new VehicleSummaryTab.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md
src/pages/admin/VehicleDetail.tsx                        # Page to update
src/components/features/shared/VehicleSummaryTab.tsx     # Component from Story 8
```

### Task
1. Update `src/pages/admin/VehicleDetail.tsx` to use VehicleSummaryTab
2. Remove Overview and Details tabs, replace with single Summary tab

### Changes to VehicleDetail.tsx

**Add import:**
```tsx
import { VehicleSummaryTab } from '@/components/features/shared/VehicleSummaryTab';
```

**Update TabsList:**
```tsx
// BEFORE:
<TabsList>
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="details">Details</TabsTrigger>
  <TabsTrigger value="credentials">Credentials</TabsTrigger>
  <TabsTrigger value="assignments">Assignments</TabsTrigger>
</TabsList>

// AFTER:
<TabsList>
  <TabsTrigger value="summary">Summary</TabsTrigger>
  <TabsTrigger value="credentials">Credentials</TabsTrigger>
  <TabsTrigger value="assignments">Assignments</TabsTrigger>
</TabsList>
```

**Update Tabs defaultValue:**
```tsx
<Tabs defaultValue="summary">
```

**Update TabsContent:**
```tsx
// REMOVE Overview and Details TabsContent blocks
// REPLACE with:
<TabsContent value="summary" className="mt-0">
  <VehicleSummaryTab
    vehicle={vehicle}
    companyId={vehicle.company_id}
    canEdit={isAdmin}
    isDriverView={false}
    onUpdatePhotos={() => setEditPhotosOpen(true)}
  />
</TabsContent>
```

**Remove old imports:**
```tsx
// REMOVE:
import { VehicleOverviewTab } from '@/components/features/admin/VehicleOverviewTab';
// (and VehicleDetailsTab if imported)
```

### Verification
- [ ] VehicleDetail page loads without errors
- [ ] "Summary" tab is selected by default
- [ ] All vehicle info displays correctly
- [ ] Photos section has working Update Photos button
- [ ] Location selector works
- [ ] Mileage input works (company vehicles)
- [ ] Other tabs (Credentials, Assignments) still work
- [ ] No TypeScript errors

---

## User Story 10: Integrate VehicleSummaryTab - Driver Portal

### Context
Update the driver VehicleDetail page to use the shared VehicleSummaryTab.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md
src/pages/driver/VehicleDetail.tsx                       # Page to update
src/components/features/shared/VehicleSummaryTab.tsx     # Component from Story 8
```

### Task
1. Update `src/pages/driver/VehicleDetail.tsx` to use VehicleSummaryTab
2. Remove Overview and Details tabs, replace with single Summary tab

### Changes to driver/VehicleDetail.tsx

**Add import:**
```tsx
import { VehicleSummaryTab } from '@/components/features/shared/VehicleSummaryTab';
```

**Update TabsList:**
```tsx
// BEFORE:
<TabsList>
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="details">Details</TabsTrigger>
  <TabsTrigger value="credentials">Credentials</TabsTrigger>
</TabsList>

// AFTER:
<TabsList>
  <TabsTrigger value="summary">Summary</TabsTrigger>
  <TabsTrigger value="credentials">Credentials</TabsTrigger>
</TabsList>
```

**Update Tabs defaultValue:**
```tsx
<Tabs defaultValue="summary">
```

**Update TabsContent:**
```tsx
// REMOVE Overview and Details TabsContent blocks
// REPLACE with:
<TabsContent value="summary" className="mt-0">
  <VehicleSummaryTab
    vehicle={vehicle}
    companyId={companyId}
    driver={driver}
    canEdit={is1099}  // Only 1099 drivers can fully edit
    isDriverView={true}
    onUpdatePhotos={() => setPhotoModalOpen(true)}
  />
</TabsContent>
```

**Remove old imports:**
```tsx
// REMOVE:
import { VehicleOverviewTab } from '@/components/features/driver/VehicleOverviewTab';
import { VehicleDetailsTab } from '@/components/features/driver/VehicleDetailsTab';
```

### Verification
- [ ] Driver VehicleDetail page loads without errors
- [ ] "Summary" tab is selected by default
- [ ] All vehicle info displays correctly
- [ ] Photos section has working Update Photos button
- [ ] Ownership section does NOT appear (driver view)
- [ ] Mileage section does NOT appear (driver view)
- [ ] Broker eligibility section DOES appear
- [ ] Credentials tab still works
- [ ] No TypeScript errors

---

## User Story 11: LocationSummaryTab

### Context
Create the location summary tab component to replace the simple LocationOverviewTab.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md    # Full context
src/components/features/admin/LocationOverviewTab.tsx    # Current overview to replace
src/components/ui/quick-stats-bar.tsx                    # Component from Story 1
src/components/ui/info-section.tsx                       # Component from Story 2
src/components/ui/property-grid.tsx                      # Component from Story 3
```

### Task
1. Create `src/components/features/shared/LocationSummaryTab.tsx`

### Component Interface

```typescript
// src/components/features/shared/LocationSummaryTab.tsx

import type { Location } from '@/types/location';

export interface LocationSummaryTabProps {
  location: Location;
  canEdit?: boolean;
}
```

### Implementation

```tsx
import { useMemo } from 'react';
import { QuickStatsBar, type QuickStat } from '@/components/ui/quick-stats-bar';
import { InfoSection } from '@/components/ui/info-section';
import { PropertyGrid } from '@/components/ui/property-grid';
import { 
  Building2, 
  Users, 
  Car, 
  FileCheck,
  MapPin,
  Phone,
} from 'lucide-react';

import { useLocationDrivers, useLocationVehicles, useLocationBrokers } from '@/hooks/useLocations';
import { useLocationCredentials } from '@/hooks/useLocationCredentials';

import type { Location } from '@/types/location';

export interface LocationSummaryTabProps {
  location: Location;
  canEdit?: boolean;
}

export function LocationSummaryTab({ location, canEdit = true }: LocationSummaryTabProps) {
  const { data: drivers } = useLocationDrivers(location.id);
  const { data: vehicles } = useLocationVehicles(location.id);
  const { data: brokers } = useLocationBrokers(location.id);
  const { data: credentials } = useLocationCredentials(location.id);

  const driverCount = drivers?.length ?? 0;
  const vehicleCount = vehicles?.length ?? 0;
  const brokerCount = brokers?.length ?? 0;
  const credentialCount = credentials?.length ?? 0;
  const credentialsComplete = credentials?.filter((c) => c.status === 'approved').length ?? 0;

  // Quick stats
  const quickStats = useMemo<QuickStat[]>(() => {
    return [
      {
        id: 'drivers',
        label: 'Drivers',
        value: driverCount,
        icon: <Users className="w-5 h-5 text-primary" />,
        status: driverCount > 0 ? 'success' : 'neutral',
        description: 'Assigned to this location',
      },
      {
        id: 'vehicles',
        label: 'Vehicles',
        value: vehicleCount,
        icon: <Car className="w-5 h-5 text-primary" />,
        status: vehicleCount > 0 ? 'success' : 'neutral',
        description: 'Assigned to this location',
      },
      {
        id: 'credentials',
        label: 'Credentials',
        value: `${credentialsComplete}/${credentialCount}`,
        icon: <FileCheck className="w-5 h-5 text-primary" />,
        status: credentialsComplete === credentialCount && credentialCount > 0 ? 'success' : 
                credentialCount > 0 ? 'warning' : 'neutral',
        description: 'Complete',
      },
      {
        id: 'trip-sources',
        label: 'Trip Sources',
        value: brokerCount,
        icon: <Building2 className="w-5 h-5 text-primary" />,
        status: brokerCount > 0 ? 'success' : 'neutral',
        description: 'Associated',
      },
    ];
  }, [driverCount, vehicleCount, credentialCount, credentialsComplete, brokerCount]);

  return (
    <div className="space-y-6">
      {/* Quick Stats Bar */}
      <QuickStatsBar stats={quickStats} columns={4} />

      {/* Location Information Section */}
      <InfoSection
        id="location-info"
        icon={<Building2 className="w-4 h-4" />}
        title="Location Information"
        description="Name and identifier"
        canEdit={false}  // Edit via main edit modal in header
      >
        <PropertyGrid
          properties={[
            { label: 'Name', value: location.name },
            { label: 'Code', value: location.code },
            { 
              label: 'Primary Location', 
              value: location.is_primary ? 'Yes' : 'No',
            },
          ]}
          columns={3}
        />
      </InfoSection>

      {/* Address Section */}
      <InfoSection
        id="address"
        icon={<MapPin className="w-4 h-4" />}
        title="Address"
        description="Physical location"
        canEdit={false}
      >
        <PropertyGrid
          properties={[
            { label: 'Address Line 1', value: location.address_line1 },
            { label: 'Address Line 2', value: location.address_line2, hidden: !location.address_line2 },
            { label: 'City', value: location.city },
            { label: 'State', value: location.state },
            { label: 'ZIP Code', value: location.zip },
          ]}
          columns={3}
        />
      </InfoSection>

      {/* Contact Section */}
      <InfoSection
        id="contact"
        icon={<Phone className="w-4 h-4" />}
        title="Contact Information"
        description="Phone and email"
        canEdit={false}
      >
        <PropertyGrid
          properties={[
            { label: 'Phone', value: location.phone },
            { label: 'Email', value: location.email },
          ]}
          columns={2}
        />
      </InfoSection>
    </div>
  );
}
```

### Verification
- [ ] Component renders without errors
- [ ] QuickStatsBar displays 4 stats with correct counts
- [ ] Location info shows name, code, primary status
- [ ] Address shows all fields when available
- [ ] Contact shows phone and email
- [ ] No TypeScript errors

---

## User Story 12: Integrate LocationSummaryTab - Admin Portal

### Context
Replace the existing LocationOverviewTab with the new LocationSummaryTab.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md
src/pages/admin/LocationDetail.tsx                       # Page to update
src/components/features/shared/LocationSummaryTab.tsx    # Component from Story 11
```

### Task
1. Update `src/pages/admin/LocationDetail.tsx` to use LocationSummaryTab
2. Tab name changes from "Overview" to "Summary"

### Changes to LocationDetail.tsx

**Add import:**
```tsx
import { LocationSummaryTab } from '@/components/features/shared/LocationSummaryTab';
```

**Update TabsList:**
```tsx
// BEFORE:
<TabsTrigger value="overview">Overview</TabsTrigger>

// AFTER:
<TabsTrigger value="summary">Summary</TabsTrigger>
```

**Update Tabs defaultValue:**
```tsx
<Tabs defaultValue="summary">
```

**Update TabsContent:**
```tsx
// BEFORE:
<TabsContent value="overview" className="mt-0">
  <LocationOverviewTab location={location} />
</TabsContent>

// AFTER:
<TabsContent value="summary" className="mt-0">
  <LocationSummaryTab location={location} canEdit={isAdmin} />
</TabsContent>
```

**Remove old import:**
```tsx
// REMOVE:
import { LocationOverviewTab } from '@/components/features/admin/LocationOverviewTab';
```

### Verification
- [ ] LocationDetail page loads without errors
- [ ] "Summary" tab is selected by default
- [ ] All location info displays correctly
- [ ] Other tabs still work (Drivers, Vehicles, Credentials, Trip Sources)
- [ ] No TypeScript errors

---

## User Story 13: Cleanup - Remove Deprecated Components

### Context
After validating all summary tabs work correctly, remove the deprecated overview/details components.

### Required Reading
```
docs/CODEX-044-UX-001-detail-page-standardization.md    # Files to deprecate section
```

### Task
1. Verify no imports of deprecated components remain
2. Delete deprecated files
3. Update any index exports

### Files to Delete

```
src/components/features/admin/DriverOverviewTab.tsx
src/components/features/admin/VehicleOverviewTab.tsx
src/components/features/admin/LocationOverviewTab.tsx
src/components/features/driver/VehicleOverviewTab.tsx
src/components/features/driver/VehicleDetailsTab.tsx
```

### Pre-Deletion Verification

**Search for any remaining imports:**
```bash
# Search for imports of deprecated components
rg "from.*DriverOverviewTab" --type ts --type tsx
rg "from.*VehicleOverviewTab" --type ts --type tsx
rg "from.*LocationOverviewTab" --type ts --type tsx
rg "from.*VehicleDetailsTab" --type ts --type tsx
```

If any imports remain, update those files before deletion.

### Post-Deletion Verification
- [ ] No grep results for deprecated component imports
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Admin DriverDetail page works
- [ ] Admin VehicleDetail page works
- [ ] Admin LocationDetail page works
- [ ] Driver Profile page works
- [ ] Driver VehicleDetail page works

---

## Implementation Order

| Order | Story | Dependencies | Description |
|-------|-------|--------------|-------------|
| 1 | Story 1 | None | QuickStatsBar component |
| 2 | Story 2 | None | InfoSection component |
| 3 | Story 3 | None | PropertyGrid component |
| 4 | Story 4 | Stories 1-3 | DriverSummaryTab - Core |
| 5 | Story 5 | Story 4 | DriverSummaryTab - Additional sections |
| 6 | Story 6 | Story 5 | Admin DriverDetail integration |
| 7 | Story 7 | Story 5 | Driver Profile integration |
| 8 | Story 8 | Stories 1-3 | VehicleSummaryTab |
| 9 | Story 9 | Story 8 | Admin VehicleDetail integration |
| 10 | Story 10 | Story 8 | Driver VehicleDetail integration |
| 11 | Story 11 | Stories 1-3 | LocationSummaryTab |
| 12 | Story 12 | Story 11 | Admin LocationDetail integration |
| 13 | Story 13 | Stories 6,7,9,10,12 | Cleanup deprecated components |

**Parallel opportunities:**
- Stories 1-3 can be done in parallel (UI components)
- After Story 3, Stories 4, 8, and 11 can start in parallel
- Story 6-7 can be done after Story 5
- Story 9-10 can be done after Story 8
- Story 12 can be done after Story 11
- Story 13 must be last (after all integrations verified)

---

## Global Verification Checklist

After completing all stories:

### UI Components
- [ ] QuickStatsBar renders with all status colors
- [ ] InfoSection shows/hides edit button correctly
- [ ] PropertyGrid handles hidden properties
- [ ] All components export from index.ts

### Driver Pages
- [ ] Admin DriverDetail shows Summary tab with all sections
- [ ] Admin can edit all driver sections
- [ ] Admin sees Notes section
- [ ] Driver Profile uses DriverSummaryTab
- [ ] Driver can edit own profile sections
- [ ] Driver does NOT see Notes section
- [ ] Driver sees location read-only

### Vehicle Pages
- [ ] Admin VehicleDetail shows Summary tab
- [ ] Admin sees Ownership and Mileage sections
- [ ] Admin can edit location assignment
- [ ] Driver VehicleDetail shows Summary tab
- [ ] Driver does NOT see Ownership or Mileage
- [ ] Driver DOES see Broker Eligibility
- [ ] 1099 driver can edit vehicle
- [ ] W2 driver can only update photos

### Location Pages
- [ ] Admin LocationDetail shows Summary tab
- [ ] Quick stats show correct counts

### No Regressions
- [ ] All edit modals still work
- [ ] Credential tabs unchanged
- [ ] Assignment tabs unchanged
- [ ] Navigation between pages works
- [ ] No TypeScript errors
- [ ] No console errors

---

## Notes for Agents

### CRITICAL: Pattern Copying Rules

1. **DO NOT HALLUCINATE COMPONENT PROPS** - Check the actual component interfaces before using them. If `vehicle.credentials_complete` doesn't exist, compute it or fetch it.

2. **Check Type Definitions** - Before using any property like `driver.ssn_last_four`, verify it exists in the type definition at `src/types/driver.ts`.

3. **Reuse Existing Modals** - All edit modals already exist. Don't create new ones unless absolutely necessary.

4. **Copy Photo Loading Patterns** - License photos and vehicle photos have specific URL resolution patterns. Copy from existing implementations.

### Common Pitfalls to Avoid

1. **Missing Supabase Import** - For license photo resolution, you need:
   ```tsx
   import { supabase } from '@/integrations/supabase/client';
   ```

2. **Avatar URL Resolution** - Driver avatars may need resolution:
   ```tsx
   import { resolveAvatarUrl } from '@/services/profile';
   ```

3. **Vehicle Photo Resolution** - Vehicle photos need:
   ```tsx
   import { resolveVehiclePhotoUrl } from '@/lib/vehiclePhoto';
   ```

4. **Type Mismatches** - `VehicleWithAssignments` vs `DriverVehicleWithStatus` are different types. Check which one you're working with.

### Testing Strategy

After each story:
1. Run `npm run typecheck`
2. Run `npm run build` (catches more errors)
3. Manually test the affected page(s)
4. Check console for errors
5. Test edit flows if applicable
