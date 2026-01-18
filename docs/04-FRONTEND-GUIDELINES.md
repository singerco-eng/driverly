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

### Admin Layout
Uses `AdminLayout.tsx` with:
- Left sidebar with navigation
- Company branding (name + primary color)
- Top header with user info

### Super Admin Layout
Uses `SuperAdminLayout.tsx` with:
- Horizontal navigation
- "Driverly" branding
- "Super Admin" badge

### Driver Layout
Uses `DriverLayout.tsx` for driver-facing pages.

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
