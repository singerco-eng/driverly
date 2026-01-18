import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  FileText,
  Camera,
  PenTool,
  ClipboardList,
  CheckCircle,
  Calendar,
  Users,
  Car,
} from 'lucide-react';
import type { CredentialType, CredentialCategory, CredentialScope } from '@/types/credential';
import CreateCredentialTypeModal from '@/components/features/admin/CreateCredentialTypeModal';

const submissionTypeIcons: Record<string, React.ElementType> = {
  document_upload: FileText,
  photo: Camera,
  signature: PenTool,
  form: ClipboardList,
  admin_verified: CheckCircle,
  date_entry: Calendar,
};

const submissionTypeLabels: Record<string, string> = {
  document_upload: 'Document Upload',
  photo: 'Photo',
  signature: 'E-Signature',
  form: 'Form',
  admin_verified: 'Admin Verified',
  date_entry: 'Date Entry',
};

const requirementColors: Record<string, string> = {
  required: 'bg-red-500/20 text-red-400 border-red-500/30',
  recommended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  optional: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
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
              { value: 'broker', label: 'Broker' },
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
                  <TableHead>Type</TableHead>
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
                    const Icon = submissionTypeIcons[ct.submission_type] || FileText;
                    return (
                      <TableRow
                        key={ct.id}
                        className={`cursor-pointer ${!ct.is_active ? 'opacity-60' : ''}`}
                        onClick={() => navigate(`/admin/settings/credentials/${ct.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md bg-muted">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                            </div>
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
                          {submissionTypeLabels[ct.submission_type]}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={requirementColors[ct.requirement]}>
                            {ct.requirement}
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
            const Icon = submissionTypeIcons[ct.submission_type] || FileText;
            const CategoryIcon = ct.category === 'driver' ? Users : Car;

            return (
              <Card
                key={ct.id}
                className={`cursor-pointer hover:shadow-soft transition-all ${
                  !ct.is_active ? 'opacity-60' : ''
                }`}
                onClick={() => navigate(`/admin/settings/credentials/${ct.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{ct.name}</CardTitle>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                          <CategoryIcon className="w-3 h-3" />
                          <span className="capitalize">{ct.category}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={requirementColors[ct.requirement]}>
                      {ct.requirement}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {submissionTypeLabels[ct.submission_type]}
                    </Badge>
                    <span>•</span>
                    <span>
                      {ct.expiration_type === 'never'
                        ? 'Never Expires'
                        : ct.expiration_type === 'fixed_interval'
                          ? `Expires in ${ct.expiration_interval_days} days`
                          : 'Driver Specifies Date'}
                    </span>
                    {!ct.is_active && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      </>
                    )}
                  </div>
                  {ct.employment_type !== 'both' && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {ct.employment_type === 'w2_only' ? 'W2 Only' : '1099 Only'}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          },
        }}
      />

      {/* Create Modal */}
      {companyId && (
        <CreateCredentialTypeModal
          companyId={companyId}
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      )}
    </>
  );
}
