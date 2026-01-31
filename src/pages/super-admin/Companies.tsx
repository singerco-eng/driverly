import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanies } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Building2, LayoutGrid, List, Users, Car, Calendar, Eye } from 'lucide-react';
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

  const companyCount = filteredCompanies.length;

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
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="cards">
        {/* Full-width header */}
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: title */}
              <div className="flex-1">
                <h1 className="text-xl font-bold">Companies</h1>
                <p className="text-sm text-muted-foreground">
                  Manage tenant companies · {companyCount} {companyCount === 1 ? 'company' : 'companies'}
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
                  Add Company
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
            />

            {/* Table view */}
            <TabsContent value="table" className="mt-0">
              <EnhancedTable loading={isLoading} skeletonRows={5} skeletonColumns={6}>
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
                    {filteredCompanies.length === 0 && !isLoading ? (
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
                          className="cursor-pointer hover:bg-muted/50"
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
              </EnhancedTable>
            </TabsContent>

            {/* Cards view */}
            <TabsContent value="cards" className="mt-0">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-lg" />
                  ))}
                </div>
              ) : filteredCompanies.length === 0 ? (
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
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCompanies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <CreateCompanyModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}

function CompanyCard({ company, onClick }: { company: CompanyWithStats; onClick: () => void }) {
  return (
    <Card className="h-full flex flex-col hover:shadow-soft transition-all">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header row with badge */}
        <div className="flex items-center justify-between">
          <Badge variant={getStatusVariant(company.status)} className="capitalize">
            {company.status}
          </Badge>
        </div>

        {/* Centered logo and company info */}
        <div 
          className="flex flex-col items-center text-center cursor-pointer"
          onClick={onClick}
        >
          {/* Company Logo/Initial */}
          <div
            className="h-16 w-16 rounded-lg flex items-center justify-center text-white font-bold text-xl mb-2"
            style={{ backgroundColor: company.primary_color }}
          >
            {company.name.charAt(0).toUpperCase()}
          </div>

          {/* Company Name */}
          <h3 className="font-semibold">{company.name}</h3>

          {/* Slug */}
          <p className="text-sm text-muted-foreground">/{company.slug}</p>
        </div>

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Admin Count */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>{company.admin_count ?? 0} admin{(company.admin_count ?? 0) !== 1 ? 's' : ''}</span>
          </div>

          {/* Driver Count */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Car className="h-4 w-4 shrink-0" />
            <span>{company.driver_count ?? 0} driver{(company.driver_count ?? 0) !== 1 ? 's' : ''}</span>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Created {new Date(company.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Button */}
        <Button variant="outline" size="sm" className="w-full mt-auto" onClick={onClick}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
