import { useState, type ElementType } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCompanyDetail } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DetailPageHeader } from '@/components/ui/DetailPageHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Car,
  Calendar,
  Clock,
  Globe,
  MoreHorizontal,
  Pencil,
  UserPlus,
  Power,
  AlertTriangle,
} from 'lucide-react';
import type { CompanyStatus } from '@/types/company';
import EditCompanyModal from '@/components/features/super-admin/EditCompanyModal';
import CompanyStatusModal from '@/components/features/super-admin/CompanyStatusModal';
import CompanyInfoTab from '@/components/features/super-admin/CompanyInfoTab';
import CompanyAdminsTab from '@/components/features/super-admin/CompanyAdminsTab';
import CompanyInvitationsTab from '@/components/features/super-admin/CompanyInvitationsTab';
import { CompanyFeaturesTab } from '@/components/features/super-admin/CompanyFeaturesTab';
import { CompanyBillingTab } from '@/components/features/super-admin/CompanyBillingTab';

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

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: company, isLoading, error } = useCompanyDetail(id!);
  const activeTab = searchParams.get('tab') ?? 'overview';

  const [showEditModal, setShowEditModal] = useState(false);
  const [statusAction, setStatusAction] = useState<'deactivate' | 'suspend' | 'reactivate' | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Company Not Found</h1>
          <p className="text-muted-foreground">Error loading company details</p>
        </div>
        <Card className="border-destructive/50 bg-destructive/5 p-6">
          <p className="text-destructive mb-4">
            {error?.message || 'Company not found'}
          </p>
          <Button variant="outline" onClick={() => navigate('/super-admin/companies')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Companies
          </Button>
        </Card>
      </div>
    );
  }

  // Build avatar/logo for header
  const avatar = (
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-soft shrink-0"
      style={{ backgroundColor: company.primary_color }}
    >
      {company.logo_url ? (
        <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover rounded-xl" />
      ) : (
        company.name.charAt(0).toUpperCase()
      )}
    </div>
  );

  // Build badges
  const badges = (
    <Badge variant={getStatusVariant(company.status)}>{company.status}</Badge>
  );

  // Build subtitle
  const subtitle = `/${company.slug}`;

  // Build actions
  const actions = (
    <>
      <Button variant="outline" onClick={() => setShowEditModal(true)} className="gap-2">
        <Pencil className="w-4 h-4" />
        Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowEditModal(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Company
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {company.status === 'active' ? (
            <>
              <DropdownMenuItem onClick={() => setStatusAction('deactivate')}>
                <Power className="w-4 h-4 mr-2" />
                Deactivate Company
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusAction('suspend')}
                className="text-destructive focus:text-destructive"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Suspend Company
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={() => setStatusAction('reactivate')}>
              <Power className="w-4 h-4 mr-2" />
              Reactivate Company
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  // Tab list for header
  const tabsList = (
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="info">Company Info</TabsTrigger>
      <TabsTrigger value="admins">Admins</TabsTrigger>
      <TabsTrigger value="invitations">Invitations</TabsTrigger>
      <TabsTrigger value="features">Features</TabsTrigger>
      <TabsTrigger value="billing">Billing</TabsTrigger>
    </TabsList>
  );

  return (
    <div className="min-h-screen bg-background">
      <Tabs key={activeTab} defaultValue={activeTab}>
        {/* Full-width header with centered tabs */}
        <DetailPageHeader
          title={company.name}
          subtitle={subtitle}
          badges={badges}
          avatar={avatar}
          onBack={() => navigate('/super-admin/companies')}
          backLabel="Back to Companies"
          centerContent={tabsList}
          actions={actions}
        />

        {/* Content area */}
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-6">
        <TabsContent value="overview" className="mt-0 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={Users} label="Admins" value={company.admin_count} />
            <StatCard icon={Users} label="Drivers" value={company.driver_count} />
            <StatCard icon={Car} label="Vehicles" value={company.vehicle_count} />
            <StatCard icon={Calendar} label="Created" value={new Date(company.created_at).toLocaleDateString()} />
            <StatCard icon={Clock} label="Updated" value={new Date(company.updated_at).toLocaleDateString()} />
            <StatCard
              icon={Globe}
              label="Timezone"
              value={company.timezone.split('/')[1] || company.timezone}
            />
          </div>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate(`/super-admin/companies/${company.id}?tab=invitations`)}
              >
                <UserPlus className="w-4 h-4" />
                Invite Admin
              </Button>
              <Button variant="outline" disabled>
                View as Admin
              </Button>
            </CardContent>
          </Card>

          {/* Deactivation/Suspension Reason Card */}
          {company.status !== 'active' && company.deactivation_reason && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">
                  {company.status === 'suspended' ? 'Suspension' : 'Deactivation'} Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{company.deactivation_reason}</p>
                {company.deactivated_at && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Since {new Date(company.deactivated_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="info" className="mt-0">
          <CompanyInfoTab company={company} />
        </TabsContent>

        <TabsContent value="admins" className="mt-0">
          <CompanyAdminsTab companyId={company.id} companyName={company.name} />
        </TabsContent>

        <TabsContent value="invitations" className="mt-0">
          <CompanyInvitationsTab companyId={company.id} companyName={company.name} />
        </TabsContent>

        <TabsContent value="features" className="mt-0">
          <CompanyFeaturesTab companyId={company.id} companyName={company.name} />
        </TabsContent>

        <TabsContent value="billing" className="mt-0">
          <CompanyBillingTab companyId={company.id} />
        </TabsContent>
          </div>
        </div>
      </Tabs>

      <EditCompanyModal company={company} open={showEditModal} onOpenChange={setShowEditModal} />

      {statusAction && (
        <CompanyStatusModal
          company={company}
          action={statusAction}
          open={!!statusAction}
          onOpenChange={(open) => !open && setStatusAction(null)}
        />
      )}
    </div>
  );
}

// Simple Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold truncate">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
