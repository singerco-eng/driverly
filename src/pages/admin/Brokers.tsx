import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Plus, Users, FileCheck, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBrokersWithStats } from '@/hooks/useBrokers';
import BrokerFormModal from '@/components/features/admin/BrokerFormModal';
import type { BrokerWithStats, BrokerStatus, BrokerAssignmentMode, TripSourceType } from '@/types/broker';
import { getBrokerAssignmentMode, getAssignmentModeLabel, getSourceTypeLabel, SOURCE_TYPE_CONFIG } from '@/types/broker';
import { Lock, UserPlus, Zap, Hospital, Shield, User, Briefcase } from 'lucide-react';

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

  const description = useMemo(() => {
    const count = filteredBrokers.length;
    return `Manage trip sources · ${count} ${count === 1 ? 'source' : 'sources'}`;
  }, [filteredBrokers.length]);

  if (error) {
    return (
      <div className="p-8">
        <div className="text-destructive">Error loading trip sources: {error.message}</div>
      </div>
    );
  }

  return (
    <>
      <EnhancedDataView
        title="Trip Sources"
        description={description}
        actionLabel="Add Trip Source"
        actionIcon={<Plus className="w-4 h-4" />}
        onActionClick={() => setShowCreateModal(true)}
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
        tableProps={{
          data: filteredBrokers,
          loading: isLoading,
          children: (
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
                {filteredBrokers.length === 0 ? (
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
                      className="cursor-pointer"
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
                        <div className="flex items-center gap-2">
                          <span>{source.assigned_count} assigned</span>
                          {source.pending_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {source.pending_count} pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ),
        }}
        cardProps={{
          data: filteredBrokers,
          loading: isLoading,
          emptyState: (
            <Card className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No trip sources found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'Try adjusting your search or filters.' : 'Get started by adding your first trip source.'}
              </p>
            </Card>
          ),
          renderCard: (source) => (
            <Card
              key={source.id}
              className={`cursor-pointer hover:shadow-soft transition-all h-full flex flex-col ${
                source.status === 'inactive' ? 'opacity-60' : ''
              }`}
              onClick={() => navigate(`/admin/brokers/${source.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {source.logo_url ? (
                        <img
                          src={source.logo_url}
                          alt={source.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{source.name}</CardTitle>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {sourceTypeIcons[source.source_type]}
                        <span>{getSourceTypeLabel(source.source_type)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusConfig[source.status].badgeVariant}>
                    {statusConfig[source.status].label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {assignmentModeIcons[getBrokerAssignmentMode(source)]}
                    <span>{getAssignmentModeLabel(getBrokerAssignmentMode(source))}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {source.service_states.length > 0
                        ? source.service_states.length > 4
                          ? `${source.service_states.slice(0, 4).join(', ')}...`
                          : source.service_states.join(', ')
                        : 'No service area set'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{source.assigned_count} drivers</span>
                    {source.pending_count > 0 && (
                      <Badge variant="outline" className="text-xs ml-1">
                        {source.pending_count} pending
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileCheck className="w-3 h-3" />
                    <span>{source.credential_count} creds</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ),
        }}
      />

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
