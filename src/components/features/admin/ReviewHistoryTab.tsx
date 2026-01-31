import { useMemo, useState } from 'react';
import { FilterBar } from '@/components/ui/filter-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  EnhancedTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { History, CheckCircle2, XCircle, Clock, User, Car, Calendar, MessageSquare } from 'lucide-react';
import { useReviewHistory } from '@/hooks/useCredentialReview';

interface ReviewHistoryTabProps {
  companyId: string;
  viewMode?: 'table' | 'cards';
}

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  approved: 'default',
  rejected: 'destructive',
  pending_review: 'secondary',
  awaiting_verification: 'secondary',
};

export function ReviewHistoryTab({ companyId, viewMode = 'table' }: ReviewHistoryTabProps) {
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

  const renderTable = () => (
    <EnhancedTable loading={isLoading} skeletonRows={5} skeletonColumns={5}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reviewer</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Credential ID</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && !isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2">
                  <History className="w-8 h-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No history entries found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.reviewer?.full_name || 'System'}
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant[item.status] || 'outline'} className="capitalize">
                    {item.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.credentialTable === 'driver_credentials' ? 'Driver' : 'Vehicle'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {item.credentialId.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </EnhancedTable>
  );

  const renderCards = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <Card className="p-12 text-center">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No history entries found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </Card>
      );
    }

    const getStatusIcon = (status: string) => {
      if (status === 'approved') return CheckCircle2;
      if (status === 'rejected') return XCircle;
      return Clock;
    };

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const StatusIcon = getStatusIcon(item.status);
          const isApproved = item.status === 'approved';
          const TypeIcon = item.credentialTable === 'driver_credentials' ? User : Car;
          const reviewerName = item.reviewer?.full_name || 'System';
          const initials = reviewerName
            .split(' ')
            .map((n) => n.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');

          return (
            <Card key={item.id} className="h-full flex flex-col hover:shadow-soft transition-all">
              <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                {/* Header row with badge */}
                <div className="flex items-center justify-between">
                  <Badge variant={statusBadgeVariant[item.status] || 'outline'} className="capitalize">
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Centered avatar and reviewer info */}
                <div className="flex flex-col items-center text-center">
                  {/* Reviewer Avatar */}
                  <div className={`
                    h-14 w-14 rounded-full flex items-center justify-center mb-2
                    ${isApproved ? 'bg-primary-muted/15 text-primary-muted' : 'bg-muted text-muted-foreground'}
                  `}>
                    <span className="font-semibold text-lg">{initials}</span>
                  </div>

                  {/* Reviewer Name */}
                  <h3 className="font-semibold">{reviewerName}</h3>

                  {/* Action + Type */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="capitalize">{item.status.replace('_', ' ')}</span>
                    <span>·</span>
                    <TypeIcon className="h-3.5 w-3.5" />
                    <span>{item.credentialTable === 'driver_credentials' ? 'Driver' : 'Vehicle'}</span>
                  </div>
                </div>

                {/* Metadata Section */}
                <div className="border-t pt-3 space-y-2 text-sm">
                  {/* Credential ID */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <History className="h-4 w-4 shrink-0" />
                    <span className="font-mono text-xs">{item.credentialId.slice(0, 8)}...</span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>{item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : '—'}</span>
                  </div>

                  {/* Notes */}
                  {(item.reviewNotes || item.rejectionReason) && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{item.reviewNotes || item.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

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

      {viewMode === 'table' ? renderTable() : renderCards()}
    </div>
  );
}
