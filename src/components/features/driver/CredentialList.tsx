import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CredentialWithDisplayStatus } from '@/types/credential';
import { CredentialCard } from './CredentialCard';

interface CredentialListProps {
  credentials: CredentialWithDisplayStatus[];
  onSubmit: (credential: CredentialWithDisplayStatus) => void;
  onView: (credential: CredentialWithDisplayStatus) => void;
  emptyMessage: string;
}

type FilterStatus = 'all' | 'action' | 'pending' | 'complete';

export function CredentialList({
  credentials,
  onSubmit,
  onView,
  emptyMessage,
}: CredentialListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return credentials.filter((item) => {
      const matchesSearch =
        !normalized || item.credentialType.name.toLowerCase().includes(normalized);

      if (!matchesSearch) return false;

      if (filter === 'all') return true;
      if (filter === 'action') {
        return ['not_submitted', 'rejected', 'expired', 'expiring'].includes(item.displayStatus);
      }
      if (filter === 'pending') {
        return ['pending_review', 'awaiting'].includes(item.displayStatus);
      }
      return item.displayStatus === 'approved';
    });
  }, [credentials, filter, search]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const orderA = a.credentialType.display_order ?? 0;
        const orderB = b.credentialType.display_order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.credentialType.name.localeCompare(b.credentialType.name);
      }),
    [filtered],
  );

  const grouped = useMemo(() => {
    const global = sorted.filter((item) => item.credentialType.scope === 'global');
    const brokerMap = new Map<string, CredentialWithDisplayStatus[]>();

    sorted
      .filter((item) => item.credentialType.scope === 'broker')
      .forEach((item) => {
        const brokerName = item.credentialType.broker?.name || 'Broker Credentials';
        const existing = brokerMap.get(brokerName) || [];
        existing.push(item);
        brokerMap.set(brokerName, existing);
      });

    return { global, brokerMap };
  }, [sorted]);

  const totalAction = credentials.filter((item) =>
    ['not_submitted', 'rejected', 'expired', 'expiring'].includes(item.displayStatus),
  ).length;
  const totalPending = credentials.filter((item) =>
    ['pending_review', 'awaiting'].includes(item.displayStatus),
  ).length;
  const totalComplete = credentials.filter((item) => item.displayStatus === 'approved').length;

  if (!credentials.length) {
    return <Card className="p-6 text-sm text-muted-foreground">{emptyMessage}</Card>;
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar with proper accessibility labels */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <Label htmlFor="credential-search" className="text-sm font-medium mb-2 block">
            Search
          </Label>
          <Input
            id="credential-search"
            placeholder="Search credentials..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="md:max-w-xs border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50"
          />
        </div>
        <div className="w-full md:w-48">
          <Label htmlFor="credential-status" className="text-sm font-medium mb-2 block">
            Status
          </Label>
          <Select value={filter} onValueChange={(value) => setFilter(value as FilterStatus)}>
            <SelectTrigger id="credential-status" className="border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="action">
                Action Needed ({totalAction})
              </SelectItem>
              <SelectItem value="pending">
                Pending ({totalPending})
              </SelectItem>
              <SelectItem value="complete">
                Complete ({totalComplete})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {sorted.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">{emptyMessage}</Card>
      )}

      {grouped.global.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Global Credentials</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {grouped.global.map((item) => (
              <CredentialCard
                key={item.credentialType.id}
                credential={item}
                onSubmit={() => onSubmit(item)}
                onView={() => onView(item)}
              />
            ))}
          </div>
        </section>
      )}

      {[...grouped.brokerMap.entries()].map(([broker, items]) => (
        <section className="space-y-3" key={broker}>
          <h3 className="text-sm font-semibold text-muted-foreground">{broker}</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <CredentialCard
                key={item.credentialType.id}
                credential={item}
                onSubmit={() => onSubmit(item)}
                onView={() => onView(item)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
