import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  FileText,
  Users,
  Car,
} from 'lucide-react';
import type { CredentialType, CredentialCategory, CredentialScope } from '@/types/credential';
import CreateCredentialTypeSimpleModal from '@/components/features/admin/CreateCredentialTypeSimpleModal';
import { CredentialRequirementsDisplay } from '@/components/features/credentials/CredentialRequirementsDisplay';

/** Requirement config using native Badge variants per design system */
const requirementConfig: Record<string, {
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  required: { label: 'Required', badgeVariant: 'default' },
  recommended: { label: 'Recommended', badgeVariant: 'secondary' },
  optional: { label: 'Optional', badgeVariant: 'outline' },
};

interface CredentialFilters {
  search?: string;
  category?: CredentialCategory | 'all';
  scope?: CredentialScope | 'all';
  status?: 'active' | 'inactive' | 'all';
}

export default function CredentialTypes() {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const companyId = profile?.company_id;

  const { data: credentialTypes, isLoading, error } = useCredentialTypes(
    companyId ?? undefined,
  );

  const [filters, setFilters] = useState<CredentialFilters>({
    category: 'all',
    scope: 'all',
    status: 'active',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter credential types
  const filteredTypes = useMemo(() => {
    if (!credentialTypes) return [];
    
    return credentialTypes.filter((ct) => {
      const matchesSearch = !filters.search || 
        ct.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = filters.category === 'all' || ct.category === filters.category;
      const matchesScope = filters.scope === 'all' || ct.scope === filters.scope;
      const matchesStatus = filters.status === 'all' || 
        (filters.status === 'active' ? ct.is_active : !ct.is_active);
      return matchesSearch && matchesCategory && matchesScope && matchesStatus;
    });
  }, [credentialTypes, filters]);

  // Add id field for EnhancedDataView compatibility
  const dataWithId = useMemo(() => {
    return filteredTypes.map(ct => ({ ...ct, id: ct.id }));
  }, [filteredTypes]);

  const description = useMemo(() => {
    const count = filteredTypes.length;
    return `Define requirements · ${count} ${count === 1 ? 'type' : 'types'}`;
  }, [filteredTypes.length]);

  const categoryFilter = filters.category ?? 'all';
  const scopeFilter = filters.scope ?? 'all';
  const statusFilter = filters.status ?? 'active';

  if (error) {
    return (
      <Card className="p-12 text-center">
        <FileText className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Error loading credential types</h3>
        <p className="text-muted-foreground">{error.message}</p>
      </Card>
    );
  }

  return (
    <>
      <EnhancedDataView
        title="Credential Types"
        description={description}
        actionLabel={isAdmin ? 'Add Type' : undefined}
        actionIcon={<Plus className="w-4 h-4" />}
        onActionClick={isAdmin ? () => setShowCreateModal(true) : undefined}
        searchValue={filters.search || ''}
        onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
        searchPlaceholder="Search credential types..."
        filters={[
          {
            value: categoryFilter,
            onValueChange: (value) =>
              setFilters((prev) => ({ ...prev, category: value as CredentialCategory | 'all' })),
            label: 'Category',
            placeholder: 'All Categories',
            options: [
              { value: 'all', label: 'All Categories' },
              { value: 'driver', label: 'Driver' },
              { value: 'vehicle', label: 'Vehicle' },
            ],
          },
          {
            value: scopeFilter,
            onValueChange: (value) =>
              setFilters((prev) => ({ ...prev, scope: value as CredentialScope | 'all' })),
            label: 'Scope',
            placeholder: 'All Scopes',
            options: [
              { value: 'all', label: 'All Scopes' },
              { value: 'global', label: 'Global' },
              { value: 'broker', label: 'Trip Source' },
            ],
          },
          {
            value: statusFilter,
            onValueChange: (value) =>
              setFilters((prev) => ({ ...prev, status: value as 'active' | 'inactive' | 'all' })),
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
          data: dataWithId,
          loading: isLoading,
          children: (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Expiration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataWithId.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No credential types found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  dataWithId.map((ct) => {
                    return (
                      <TableRow
                        key={ct.id}
                        className={`cursor-pointer ${!ct.is_active ? 'opacity-60' : ''}`}
                        onClick={() => navigate(`/admin/settings/credentials/${ct.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">{ct.name}</div>
                              {!ct.is_active && (
                                <span className="text-xs text-muted-foreground">Inactive</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {ct.category === 'driver' ? (
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <Car className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <span className="capitalize">{ct.category}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <CredentialRequirementsDisplay
                            credentialType={ct}
                            showLabels={false}
                            showStepCount={true}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={requirementConfig[ct.requirement]?.badgeVariant || 'outline'}>
                            {requirementConfig[ct.requirement]?.label || ct.requirement}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ct.expiration_type === 'never'
                            ? 'Never'
                            : ct.expiration_type === 'fixed_interval'
                              ? `${ct.expiration_interval_days} days`
                              : 'Driver Specifies'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          ),
        }}
        cardProps={{
          data: dataWithId,
          loading: isLoading,
          emptyState: (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No credential types found</h3>
              <p className="text-muted-foreground">
                {filters.search || filters.category !== 'all' || filters.scope !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by creating your first credential type.'}
              </p>
            </Card>
          ),
          renderCard: (ct) => {
            const stepCount = ct.instruction_config?.steps?.length || 0;

            return (
              <Card
                key={ct.id}
                className={`cursor-pointer hover:shadow-soft transition-all ${
                  !ct.is_active ? 'opacity-60' : ''
                }`}
                onClick={() => navigate(`/admin/settings/credentials/${ct.id}`)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{ct.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{ct.category}</p>
                      </div>
                    </div>
                    <Badge variant={requirementConfig[ct.requirement]?.badgeVariant || 'outline'}>
                      {requirementConfig[ct.requirement]?.label || ct.requirement}
                    </Badge>
                  </div>
                  {/* Metadata row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {stepCount > 0 && (
                      <span>{stepCount} steps</span>
                    )}
                    {stepCount > 0 && (
                      <span className="text-border">·</span>
                    )}
                    <span>
                      {ct.expiration_type === 'never'
                        ? 'Never expires'
                        : ct.expiration_type === 'fixed_interval'
                          ? `${ct.expiration_interval_days} day expiry`
                          : 'Driver specifies'}
                    </span>
                    <span className="text-border">·</span>
                    <span className="capitalize">{ct.scope}</span>
                    {!ct.is_active && (
                      <>
                        <span className="text-border">·</span>
                        <span className="text-destructive">Inactive</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          },
        }}
      />

      {/* Create Modal */}
      {companyId && (
        <CreateCredentialTypeSimpleModal
          companyId={companyId}
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      )}
    </>
  );
}
