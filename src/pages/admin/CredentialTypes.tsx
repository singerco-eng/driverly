import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, Users, Car, LayoutGrid, List } from 'lucide-react';
import type { CredentialType, CredentialCategory, CredentialScope } from '@/types/credential';
import CreateCredentialTypeSimpleModal from '@/components/features/admin/CreateCredentialTypeSimpleModal';
import { CredentialTypeCard } from '@/components/features/admin/CredentialTypeCard';
import {
  getAllRequirements,
  getStepCount,
  isAdminOnlyCredential,
} from '@/lib/credentialRequirements';

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

  const typeCount = filteredTypes.length;
  const categoryFilter = filters.category ?? 'all';
  const scopeFilter = filters.scope ?? 'all';
  const statusFilter = filters.status ?? 'active';

  const getRequirementsSummary = (credentialType: CredentialType) => {
    if (isAdminOnlyCredential(credentialType)) {
      return 'Admin only';
    }

    const parts: string[] = [];
    const stepCount = getStepCount(credentialType.instruction_config);
    const requirements = getAllRequirements(credentialType);

    if (stepCount > 0) {
      parts.push(`${stepCount} ${stepCount === 1 ? 'step' : 'steps'}`);
    }

    requirements.forEach((req) => {
      parts.push(req.label);
    });

    if (parts.length === 0) {
      return 'No requirements';
    }

    return parts.join(', ');
  };

  if (error) {
    return (
      <Card className="p-12 text-center">
        <FileText className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Error loading credential types</h3>
        <p className="text-muted-foreground">{error.message}</p>
      </Card>
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
                  <h1 className="text-xl font-bold">Credential Types</h1>
                  <p className="text-sm text-muted-foreground">
                    Define requirements · {typeCount} {typeCount === 1 ? 'type' : 'types'}
                  </p>
                </div>

                {/* Center: view toggle */}
                <div className="flex items-center justify-center">
                  {viewToggle}
                </div>

                {/* Right: action button */}
                <div className="flex-1 flex justify-end">
                  {isAdmin && (
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Type
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="p-6">
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Filter bar */}
              <FilterBar
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
              />

              {/* Table view */}
              <TabsContent value="table" className="mt-0">
                <EnhancedTable loading={isLoading} skeletonRows={5} skeletonColumns={5}>
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
                      {filteredTypes.length === 0 && !isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="w-8 h-8 text-muted-foreground" />
                              <p className="text-muted-foreground">No credential types found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTypes.map((ct) => (
                          <TableRow
                            key={ct.id}
                            className={`cursor-pointer hover:bg-muted/50 ${!ct.is_active ? 'opacity-60' : ''}`}
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
                              {getRequirementsSummary(ct)}
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
                      <Skeleton key={i} className="h-32 rounded-lg" />
                    ))}
                  </div>
                ) : filteredTypes.length === 0 ? (
                  <Card className="p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No credential types found</h3>
                    <p className="text-muted-foreground">
                      {filters.search || filters.category !== 'all' || filters.scope !== 'all'
                        ? 'Try adjusting your search or filters.'
                        : 'Get started by creating your first credential type.'}
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredTypes.map((ct) => (
                      <CredentialTypeCard key={ct.id} credentialType={ct} />
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
        <CreateCredentialTypeSimpleModal
          companyId={companyId}
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      )}
    </>
  );
}
