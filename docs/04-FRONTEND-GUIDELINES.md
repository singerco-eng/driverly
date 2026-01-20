# Frontend Guidelines

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with CSS variables
- **Components**: shadcn/ui (Radix UI primitives)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation

## Design System

### Color Tokens

All colors are defined as CSS variables in `src/index.css` and use HSL format:

```css
--primary: 142 76% 36%;      /* Green - main brand color */
--background: 160 30% 6%;    /* Dark background */
--foreground: 0 0% 98%;      /* Light text */
--muted: 160 20% 15%;        /* Muted backgrounds */
--accent: 160 25% 20%;       /* Accent backgrounds */
--destructive: 0 84% 60%;    /* Red for errors/danger */
```

### Component Library

All UI components are in `src/components/ui/`. Use these instead of building custom components.

#### Button Variants

```tsx
import { Button } from "@/components/ui/button";

// Available variants
<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="ghost">Tertiary Action</Button>
<Button variant="destructive">Danger Action</Button>
<Button variant="link">Link Style</Button>
<Button variant="gradient">Gradient (hero buttons)</Button>
<Button variant="glass-subtle">Glass Effect</Button>

// Available sizes
<Button size="default">Normal</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon Only</Button>
```

#### Form Components

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
```

#### Layout Components

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

#### Feedback Components

```tsx
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
```

### Spacing & Layout

Use Tailwind's spacing scale consistently:

- `space-y-2` - Tight spacing (within form groups)
- `space-y-4` - Normal spacing (between form fields)
- `space-y-6` - Section spacing
- `gap-4` - Grid/flex gaps

### Grid Patterns

```tsx
// Two column responsive grid
<div className="grid gap-4 md:grid-cols-2">

// Three column responsive grid
<div className="grid gap-4 md:grid-cols-3">

// Form with label above input
<div className="space-y-2">
  <Label htmlFor="field">Field Name</Label>
  <Input id="field" />
</div>
```

### Error Display Pattern

```tsx
// Consistent error message styling
{errors['fieldName'] && (
  <p className="text-sm text-destructive">{errors['fieldName']}</p>
)}
```

## Page Layouts

All portals use the **Sidebar Layout Pattern** for consistency:

### Standard Layout Structure

```tsx
// All layouts (Admin, Driver, Super Admin) use this structure:
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>  {/* Branding */}
    <SidebarContent> {/* Navigation */}
    <SidebarFooter>  {/* User menu dropdown */}
  </Sidebar>
  <SidebarInset>
    <header className="md:hidden"> {/* Mobile hamburger */}
    <main className="flex-1 overflow-auto p-6">
      <Outlet />
    </main>
  </SidebarInset>
</SidebarProvider>
```

### Layout Files

| Portal | Layout File | Branding |
|--------|-------------|----------|
| Admin | `AdminLayout.tsx` | Company logo/name |
| Driver | `DriverLayout.tsx` | Company logo/name |
| Super Admin | `SuperAdminLayout.tsx` | "Driverly" + badge |

---

## Interface Type Patterns

### Pattern 1: List Page

**Component:** `EnhancedDataView`  
**Examples:** `/admin/vehicles`, `/admin/drivers`, `/driver/vehicles`

```tsx
<EnhancedDataView
  title="Vehicles"
  description="Manage vehicles · 12 vehicles"
  actionLabel="Add Vehicle"
  actionIcon={<Plus className="w-4 h-4" />}
  onActionClick={() => setCreateOpen(true)}
  searchValue={filters.search}
  onSearchChange={(v) => setFilters({ ...filters, search: v })}
  searchPlaceholder="Search..."
  filters={[
    {
      value: statusFilter,
      onValueChange: (v) => setFilters({ ...filters, status: v }),
      label: 'Status',
      placeholder: 'All Status',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
      ],
    },
  ]}
  isLoading={isLoading}
  isEmpty={items.length === 0}
  emptyIcon={<Car className="w-12 h-12" />}
  emptyTitle="No vehicles"
  emptyDescription="Add your first vehicle"
>
  {/* Card view content */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {items.map(item => <ItemCard key={item.id} />)}
  </div>
  
  {/* Table view content */}
  <Table>...</Table>
</EnhancedDataView>
```

**Key Rules:**
- Always use `EnhancedDataView` for list pages
- Include search and at least one filter
- Provide card AND table view content
- Include empty state with icon/message
- Primary action in top-right

---

### Pattern 2: Detail/Edit Page

**Examples:** `/admin/vehicles/:id`, `/admin/drivers/:id`

```tsx
export default function DetailPage() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/admin/vehicles"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Vehicles
      </Link>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            <Badge variant={statusVariant}>{status}</Badge>
          </div>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Action 1</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Danger Action
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs (full-width, no card wrapper) */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          {/* Content directly, NOT wrapped in Card */}
          <OverviewSection />
        </TabsContent>
        <TabsContent value="details">
          <DetailsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Key Rules:**
- Full width (NO `max-w-*` constraints)
- Back link at top
- Title + Badge + Actions row
- Tabs are full-width, content is NOT wrapped in Cards
- 3-dot menu for secondary actions
- Edit button opens modal

---

### Pattern 3: Create/Edit Modal

**Component:** `Dialog`  
**Examples:** `CreateVehicleModal`, `EditDriverModal`

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Create Vehicle</DialogTitle>
      <DialogDescription>
        Add a new vehicle to the fleet.
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
      <div className="space-y-2">
        <Label htmlFor="make">Make</Label>
        <Input id="make" {...register('make')} />
        {errors.make && (
          <p className="text-sm text-destructive">{errors.make.message}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

**For tabbed modals (complex forms):**

```tsx
<DialogContent className="sm:max-w-2xl">
  <DialogHeader>
    <DialogTitle>Edit Vehicle</DialogTitle>
  </DialogHeader>
  
  <Tabs defaultValue="basic" className="mt-4">
    <TabsList className="grid w-full grid-cols-4">
      <TabsTrigger value="basic">Basic</TabsTrigger>
      <TabsTrigger value="details">Details</TabsTrigger>
      <TabsTrigger value="photos">Photos</TabsTrigger>
      <TabsTrigger value="status">Status</TabsTrigger>
    </TabsList>
    <TabsContent value="basic">...</TabsContent>
    {/* ... */}
  </Tabs>
  
  <DialogFooter>...</DialogFooter>
</DialogContent>
```

---

### Pattern 4: Multi-Step Wizard

**Examples:** `AddVehicleWizard`, Driver Application

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Add Vehicle</DialogTitle>
      <DialogDescription>
        Step {currentStep} of {totalSteps}: {stepTitle}
      </DialogDescription>
    </DialogHeader>

    {/* Progress indicator */}
    <div className="w-full bg-muted rounded-full h-2">
      <div 
        className="bg-primary h-2 rounded-full transition-all"
        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
      />
    </div>

    {/* Step content */}
    {currentStep === 1 && <Step1Form />}
    {currentStep === 2 && <Step2Form />}

    <DialogFooter>
      {currentStep > 1 && (
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
      )}
      {currentStep < totalSteps ? (
        <Button onClick={handleNext}>Next</Button>
      ) : (
        <Button onClick={handleSubmit}>Complete</Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Pattern 5: Dashboard Page

**Examples:** `/admin`, `/driver`

```tsx
export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {name}</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">+3 this month</p>
          </CardContent>
        </Card>
        {/* More stat cards */}
      </div>

      {/* Content sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>...</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>...</CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## Status Badge Standards

**Always use Badge variants, not custom classes:**

```tsx
// ✅ Correct
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Inactive</Badge>
<Badge variant="destructive">Suspended</Badge>
<Badge variant="outline">Archived</Badge>

// ❌ Wrong - custom classes
<Badge className="bg-green-500/20 text-green-600">Active</Badge>
```

### Status Variant Mapping

| Status | Badge Variant |
|--------|---------------|
| active, approved, complete | `default` (green) |
| inactive, pending, draft | `secondary` (gray) |
| suspended, rejected, error | `destructive` (red) |
| archived, retired, expired | `outline` (border only) |

---

## Loading States

**Always use `<Skeleton>` component:**

```tsx
// ✅ Correct
<Skeleton className="h-8 w-48" />
<Skeleton className="h-32 w-full" />

// ❌ Wrong - custom pulse divs
<div className="h-8 w-48 bg-muted animate-pulse" />
```

**Full page loading:**

```tsx
if (isLoading) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

## Data Fetching Patterns

### React Query Hooks

All data fetching uses custom hooks in `src/hooks/`:

```tsx
// Fetching data
const { data, isLoading, error } = useCompanies();

// Mutations
const createCompany = useCreateCompany();
await createCompany.mutateAsync(data);
```

### Loading States

```tsx
if (isLoading) {
  return <Skeleton className="h-20 w-full" />;
}
```

### Error Handling

```tsx
const { toast } = useToast();

try {
  await mutation.mutateAsync(data);
  toast({ title: "Success", description: "Operation completed" });
} catch (error) {
  toast({ 
    title: "Error", 
    description: error.message,
    variant: "destructive" 
  });
}
```

## File Organization

```
src/
├── components/
│   ├── ui/              # Design system components
│   ├── features/        # Feature-specific components
│   │   ├── admin/
│   │   ├── apply/
│   │   ├── driver/
│   │   └── super-admin/
│   ├── layouts/         # Page layouts
│   └── shared/          # Shared components
├── hooks/               # Custom React hooks
├── services/            # API service functions
├── contexts/            # React contexts
├── pages/               # Page components
├── types/               # TypeScript types
└── lib/                 # Utilities and helpers
```

## Accessibility

- All form inputs must have associated `<Label>` components
- Use semantic HTML (`<main>`, `<nav>`, `<header>`)
- Buttons must have descriptive text or `aria-label`
- Color contrast must meet WCAG AA standards
- Interactive elements must be keyboard accessible

## Performance

- Use React Query for caching and deduplication
- Lazy load routes with `React.lazy()`
- Optimize images before upload
- Avoid inline function definitions in render

## Testing

Components should be testable in isolation. Keep business logic in hooks/services, not in components.
