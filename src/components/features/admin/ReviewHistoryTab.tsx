import { useMemo, useState } from 'react';
import { FilterBar } from '@/components/ui/filter-bar';
import { Card } from '@/components/ui/card';
import { useReviewHistory } from '@/hooks/useCredentialReview';

interface ReviewHistoryTabProps {
  companyId: string;
}

export function ReviewHistoryTab({ companyId }: ReviewHistoryTabProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { data: history, isLoading } = useReviewHistory(companyId);

  const statusOptions = useMemo(() => {
    const unique = new Set((history || []).map((item) => item.status));
    return ['all', ...Array.from(unique)].map((value) => ({
      value,
      label: value === 'all' ? 'All Status' : value.replace('_', ' '),
    }));
  }, [history]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (history || []).filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (tableFilter !== 'all' && item.credentialTable !== tableFilter) return false;
      if (!query) return true;

      const reviewer = item.reviewer?.full_name?.toLowerCase() || '';
      const notes = item.reviewNotes?.toLowerCase() || '';
      const rejection = item.rejectionReason?.toLowerCase() || '';
      return (
        item.credentialId.toLowerCase().includes(query) ||
        reviewer.includes(query) ||
        notes.includes(query) ||
        rejection.includes(query)
      );
    });
  }, [history, search, statusFilter, tableFilter]);

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by reviewer, credential id, or notes..."
        filters={[
          {
            value: statusFilter,
            onValueChange: setStatusFilter,
            label: 'Status',
            placeholder: 'All Status',
            options: statusOptions,
          },
          {
            value: tableFilter,
            onValueChange: setTableFilter,
            label: 'Type',
            placeholder: 'All Types',
            options: [
              { value: 'all', label: 'All Types' },
              { value: 'driver_credentials', label: 'Driver' },
              { value: 'vehicle_credentials', label: 'Vehicle' },
            ],
          },
        ]}
        showClearAll
        onClearAll={() => {
          setStatusFilter('all');
          setTableFilter('all');
          setSearch('');
        }}
      />

      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-6 text-sm text-muted-foreground">Loading history...</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No history entries found.</Card>
        ) : (
          filtered.map((item) => (
            <Card key={item.id} className="p-4 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium capitalize">
                  {item.status.replace('_', ' ')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : '—'}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {item.credentialTable === 'driver_credentials' ? 'Driver' : 'Vehicle'} ·{' '}
                {item.credentialId}
              </div>
              {item.reviewer?.full_name && (
                <div className="text-xs text-muted-foreground">Reviewer: {item.reviewer.full_name}</div>
              )}
              {(item.reviewNotes || item.rejectionReason) && (
                <div className="text-sm">
                  {item.reviewNotes || item.rejectionReason}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
