import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Plus, Users, FileCheck, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBrokersWithStats } from '@/hooks/useBrokers';
import CreateBrokerModal from '@/components/features/admin/CreateBrokerModal';
import type { BrokerWithStats, BrokerStatus } from '@/types/broker';

const statusStyles: Record<BrokerStatus, string> = {
  active: 'bg-green-500/20 text-green-600 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
};

export default function Brokers() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: brokers, isLoading, error } = useBrokersWithStats(companyId ?? undefined);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BrokerStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredBrokers = useMemo(() => {
    return (brokers || []).filter((broker) => {
      const matchesSearch =
        broker.name.toLowerCase().includes(search.toLowerCase()) ||
        broker.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
        broker.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        broker.code?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || broker.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [brokers, search, statusFilter]);

  const description = useMemo(() => {
    const count = filteredBrokers.length;
    return `Manage broker relationships · ${count} ${count === 1 ? 'broker' : 'brokers'}`;
  }, [filteredBrokers.length]);

  if (error) {
    return (
      <div className="p-8">
        <div className="text-destructive">Error loading brokers: {error.message}</div>
      </div>
    );
  }

  return (
    <>
      <EnhancedDataView
        title="Brokers"
        description={description}
        actionLabel="Add Broker"
        actionIcon={<Plus className="w-4 h-4" />}
        onActionClick={() => setShowCreateModal(true)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, code, or contact..."
        filters={[
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
                  <TableHead>Broker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Service Area</TableHead>
                  <TableHead>Drivers</TableHead>
                  <TableHead>Credentials</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrokers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No brokers found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBrokers.map((broker) => (
                    <TableRow
                      key={broker.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/brokers/${broker.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            {broker.logo_url ? (
                              <img
                                src={broker.logo_url}
                                alt={broker.name}
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{broker.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {broker.contact_email || broker.code || '—'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[broker.status]}>
                          {broker.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span>
                            {broker.service_states.length > 0
                              ? broker.service_states.length > 3
                                ? `${broker.service_states.slice(0, 3).join(', ')}...`
                                : broker.service_states.join(', ')
                              : '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{broker.assigned_count} assigned</span>
                          {broker.pending_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {broker.pending_count} pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span>{broker.credential_count} required</span>
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
              <h3 className="text-lg font-medium mb-2">No brokers found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'Try adjusting your search or filters.' : 'Get started by adding your first broker.'}
              </p>
            </Card>
          ),
          renderCard: (broker) => (
            <Card
              key={broker.id}
              className={`cursor-pointer hover:shadow-soft transition-all ${
                broker.status === 'inactive' ? 'opacity-60' : ''
              }`}
              onClick={() => navigate(`/admin/brokers/${broker.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      {broker.logo_url ? (
                        <img
                          src={broker.logo_url}
                          alt={broker.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{broker.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {broker.contact_email || broker.code || '—'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusStyles[broker.status]}>
                    {broker.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {broker.service_states.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {broker.service_states.length > 4
                          ? `${broker.service_states.slice(0, 4).join(', ')}...`
                          : broker.service_states.join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{broker.assigned_count} drivers</span>
                      {broker.pending_count > 0 && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {broker.pending_count} pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileCheck className="w-3 h-3" />
                      <span>{broker.credential_count} creds</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ),
        }}
      />

      {/* Create Modal */}
      {companyId && (
        <CreateBrokerModal
          companyId={companyId}
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      )}
    </>
  );
}
