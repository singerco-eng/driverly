import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanies } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Building2 } from 'lucide-react';
import type { CompanyStatus, CompanyWithStats } from '@/types/company';
import CreateCompanyModal from '@/components/features/super-admin/CreateCompanyModal';

// DS-compliant status badge variants
const getStatusVariant = (status: CompanyStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'active':
      return 'default';
    case 'inactive':
      return 'secondary';
    case 'suspended':
      return 'destructive';
    default:
      return 'outline';
  }
};

export default function Companies() {
  const navigate = useNavigate();
  const { data: companies, isLoading, error } = useCompanies();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredCompanies = companies?.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      company.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50 bg-destructive/5 p-6">
          <h1 className="text-xl font-bold text-destructive mb-2">Error Loading Companies</h1>
          <p className="text-destructive">{error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Single unified header via EnhancedDataView */}
      <EnhancedDataView<CompanyWithStats>
        title="Companies"
        description={`Manage tenant companies · ${filteredCompanies.length} ${filteredCompanies.length === 1 ? 'company' : 'companies'}`}
        actionLabel="Add Company"
        actionIcon={<Plus className="w-4 h-4" />}
        onActionClick={() => setShowCreateModal(true)}
        defaultViewMode="card"
        cardLabel="Cards"
        tableLabel="Table"
        showViewModeToggle={true}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or slug..."
        filters={[
          {
            value: statusFilter,
            onValueChange: setStatusFilter,
            label: 'Status',
            placeholder: 'All Status',
            options: [
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ],
          },
        ]}
        tableProps={{
          loading: isLoading,
          skeletonRows: 5,
          skeletonColumns: 5,
          children: (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Admins</TableHead>
                  <TableHead className="text-center">Drivers</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {search || statusFilter !== 'all'
                            ? 'No companies match your filters'
                            : 'No companies yet'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow
                      key={company.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                            style={{ backgroundColor: company.primary_color }}
                          >
                            {company.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{company.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">/{company.slug}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(company.status)}>
                          {company.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{company.admin_count ?? 0}</TableCell>
                      <TableCell className="text-center">{company.driver_count ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(company.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ),
        }}
        cardProps={{
          data: filteredCompanies,
          loading: isLoading,
          skeletonCount: 6,
          emptyState: (
            <Card className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No companies found</h3>
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first company'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Company
                </Button>
              )}
            </Card>
          ),
          renderCard: (company) => (
            <CompanyCard
              company={company}
              onClick={() => navigate(`/super-admin/companies/${company.id}`)}
            />
          ),
        }}
      />

      <CreateCompanyModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}

function CompanyCard({ company, onClick }: { company: CompanyWithStats; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:shadow-glow hover:border-primary/50 transition-all duration-300"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-soft"
              style={{ backgroundColor: company.primary_color }}
            >
              {company.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-lg">{company.name}</CardTitle>
              <p className="text-sm text-muted-foreground">/{company.slug}</p>
            </div>
          </div>
          <Badge variant={getStatusVariant(company.status)}>{company.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="font-medium text-foreground">{company.admin_count ?? 0}</span> admins
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium text-foreground">{company.driver_count ?? 0}</span> drivers
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30">
          Created {new Date(company.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
