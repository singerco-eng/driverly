import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Plus, Users, FileCheck, MapPin, LayoutGrid, List, Lock, UserPlus, Zap, Hospital, Shield, User, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBrokersWithStats } from '@/hooks/useBrokers';
import BrokerFormModal from '@/components/features/admin/BrokerFormModal';
import { BrokerCard } from '@/components/features/admin/BrokerCard';
import type { BrokerWithStats, BrokerStatus, BrokerAssignmentMode, TripSourceType } from '@/types/broker';
import { getBrokerAssignmentMode, getAssignmentModeLabel, getSourceTypeLabel } from '@/types/broker';

/** Status config using native Badge variants per design system */
const statusConfig: Record<BrokerStatus, { 
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  active: { label: 'Active', badgeVariant: 'default' },
  inactive: { label: 'Inactive', badgeVariant: 'secondary' },
};

/** Assignment mode icons - all use muted foreground for consistency */
const assignmentModeIcons: Record<BrokerAssignmentMode, React.ReactNode> = {
  admin_only: <Lock className="w-3 h-3" />,
  driver_requests: <UserPlus className="w-3 h-3" />,
  driver_auto_signup: <Zap className="w-3 h-3" />,
};

const sourceTypeIcons: Record<TripSourceType, React.ReactNode> = {
  state_broker: <Building2 className="w-3 h-3" />,
  facility: <Hospital className="w-3 h-3" />,
  insurance: <Shield className="w-3 h-3" />,
  private: <User className="w-3 h-3" />,
  corporate: <Briefcase className="w-3 h-3" />,
};

export default function Brokers() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: brokers, isLoading, error } = useBrokersWithStats(companyId ?? undefined);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BrokerStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TripSourceType | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredBrokers = useMemo(() => {
    return (brokers || []).filter((broker) => {
      const matchesSearch =
        broker.name.toLowerCase().includes(search.toLowerCase()) ||
        broker.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
        broker.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        broker.code?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || broker.status === statusFilter;
      const matchesType = typeFilter === 'all' || broker.source_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [brokers, search, statusFilter, typeFilter]);

  const brokerCount = filteredBrokers.length;

  if (error) {
    return (
      <div className="p-8">
        <div className="text-destructive">Error loading trip sources: {error.message}</div>
      </div>
    );
  }

  // View toggle in header
  const viewToggle = (
    <TabsList>
      <TabsTrigger value="table" className="gap-1.5">
        <List className="w-4 h-4" />
        Table
      </TabsTrigger>
      <TabsTrigger value="cards" className="gap-1.5">
        <LayoutGrid className="w-4 h-4" />
        Cards
      </TabsTrigger>
    </TabsList>
  );

  return (
    <>
      <div className="min-h-screen bg-background">
        <Tabs defaultValue="table">
          {/* Full-width header */}
          <div className="border-b bg-background">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left: title */}
                <div className="flex-1">
                  <h1 className="text-xl font-bold">Trip Sources</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage trip sources · {brokerCount} {brokerCount === 1 ? 'source' : 'sources'}
                  </p>
                </div>

                {/* Center: view toggle */}
                <div className="flex items-center justify-center">
                  {viewToggle}
                </div>

                {/* Right: action button */}
                <div className="flex-1 flex justify-end">
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Trip Source
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="p-6">
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Filter bar */}
              <FilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by name, code, or contact..."
                filters={[
                  {
                    value: typeFilter,
                    onValueChange: (value) => setTypeFilter(value as TripSourceType | 'all'),
                    label: 'Type',
                    placeholder: 'All Types',
                    options: [
                      { value: 'all', label: 'All Types' },
                      { value: 'state_broker', label: 'State Broker' },
                      { value: 'facility', label: 'Facility' },
                      { value: 'insurance', label: 'Insurance' },
                      { value: 'private', label: 'Private' },
                      { value: 'corporate', label: 'Corporate' },
                    ],
                  },
                  {
                    value: statusFilter,
                    onValueChange: (value) => setStatusFilter(value as BrokerStatus | 'all'),
                    label: 'Status',
                    placeholder: 'All Status',
                    options: [
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ],
                  },
                ]}
              />

              {/* Table view */}
              <TabsContent value="table" className="mt-0">
                <EnhancedTable loading={isLoading} skeletonRows={5} skeletonColumns={6}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Service Area</TableHead>
                        <TableHead>Drivers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBrokers.length === 0 && !isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Building2 className="w-8 h-8 text-muted-foreground" />
                              <p className="text-muted-foreground">No trip sources found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBrokers.map((source) => (
                          <TableRow
                            key={source.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/admin/brokers/${source.id}`)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                  {source.logo_url ? (
                                    <img
                                      src={source.logo_url}
                                      alt={source.name}
                                      className="w-8 h-8 object-contain"
                                    />
                                  ) : (
                                    <Building2 className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">{source.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {source.contact_email || source.code || '—'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                {sourceTypeIcons[source.source_type]}
                                <span>{getSourceTypeLabel(source.source_type)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig[source.status].badgeVariant}>
                                {statusConfig[source.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const mode = getBrokerAssignmentMode(source);
                                return (
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    {assignmentModeIcons[mode]}
                                    <span>{getAssignmentModeLabel(mode)}</span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span>
                                  {source.service_states.length > 0
                                    ? source.service_states.length > 3
                                      ? `${source.service_states.slice(0, 3).join(', ')}...`
                                      : source.service_states.join(', ')
                                    : '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span>
                                {source.assigned_count} assigned
                                {source.pending_count > 0 && ` · ${source.pending_count} pending`}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </EnhancedTable>
              </TabsContent>

              {/* Cards view */}
              <TabsContent value="cards" className="mt-0">
                {isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-48 rounded-lg" />
                    ))}
                  </div>
                ) : filteredBrokers.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No trip sources found</h3>
                    <p className="text-muted-foreground mb-4">
                      {search ? 'Try adjusting your search or filters.' : 'Get started by adding your first trip source.'}
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredBrokers.map((source) => (
                      <BrokerCard key={source.id} broker={source} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Create Modal */}
      {companyId && (
        <BrokerFormModal
          companyId={companyId}
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      )}
    </>
  );
}
