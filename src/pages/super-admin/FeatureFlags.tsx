import { useMemo, useState } from 'react';
import { Filter, Search, ToggleLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FeatureFlagTable } from '@/components/features/super-admin/FeatureFlagTable';
import { useAllFeatureFlags } from '@/hooks/useFeatureFlags';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'billing', label: 'Billing' },
  { value: 'core', label: 'Core' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'general', label: 'General' },
];

export default function FeatureFlags() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const { data: flags, isLoading } = useAllFeatureFlags();

  const filteredFlags = useMemo(() => {
    return (flags ?? []).filter((flag) => {
      const matchesSearch =
        !search ||
        flag.name.toLowerCase().includes(search.toLowerCase()) ||
        flag.key.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || flag.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [flags, search, category]);

  const groupedFlags = useMemo(() => {
    return filteredFlags.reduce(
      (acc, flag) => {
        const flagCategory = flag.category || 'general';
        if (!acc[flagCategory]) acc[flagCategory] = [];
        acc[flagCategory].push(flag);
        return acc;
      },
      {} as Record<string, typeof filteredFlags>
    );
  }, [filteredFlags]);

  const flagCount = filteredFlags.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width header */}
      <div className="border-b bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <ToggleLeft className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Feature Flags</h1>
                <p className="text-sm text-muted-foreground">
                  Control feature availability · {flagCount} {flagCount === 1 ? 'flag' : 'flags'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Filter bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search flags..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-52">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedFlags).map(([group, groupFlags]) => (
                <div key={group} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground capitalize flex items-center gap-2">
                    {group}
                    <Badge variant="secondary">{groupFlags.length}</Badge>
                  </h3>
                  <FeatureFlagTable flags={groupFlags} />
                </div>
              ))}

              {filteredFlags.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No flags found matching your filters.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
