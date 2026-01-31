import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDriver, useUpdateDriverStatus } from '@/hooks/useDrivers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/user-avatar';
import { DetailPageHeader } from '@/components/ui/DetailPageHeader';
import { resolveAvatarUrl } from '@/services/profile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Edit,
  MoreVertical,
  MessageSquare,
  CheckCircle,
  XCircle,
  Archive,
  AlertTriangle,
} from 'lucide-react';
import { DriverOverviewTab } from '@/components/features/admin/DriverOverviewTab';
import { DriverProfileTab } from '@/components/features/admin/DriverProfileTab';
import { DriverVehiclesTab } from '@/components/features/admin/DriverVehiclesTab';
import { DriverCredentialsTab } from '@/components/features/admin/DriverCredentialsTab';
import { EditDriverModal } from '@/components/features/admin/EditDriverModal';
import { SuspendDriverModal } from '@/components/features/admin/SuspendDriverModal';
import { UpgradeModal } from '@/components/features/admin/UpgradeModal';
import { useAuth } from '@/contexts/AuthContext';
import type { DriverStatus } from '@/types/driver';
import { driverStatusVariant } from '@/lib/status-styles';
import { checkCanAddOperator } from '@/services/billing';
import { useToast } from '@/hooks/use-toast';

const statusLabels: Record<DriverStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  archived: 'Archived',
};

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: driver, isLoading, error } = useDriver(id || '');
  const updateStatus = useUpdateDriverStatus();
  const [editOpen, setEditOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Resolve avatar URL for display
  useEffect(() => {
    let isMounted = true;
    async function loadAvatar() {
      if (driver?.user?.avatar_url) {
        const resolved = await resolveAvatarUrl(driver.user.avatar_url);
        if (isMounted) setAvatarUrl(resolved);
      } else {
        if (isMounted) setAvatarUrl(null);
      }
    }
    void loadAvatar();
    return () => { isMounted = false; };
  }, [driver?.user?.avatar_url]);

  const handleStatusChange = async (newStatus: DriverStatus, reason?: string) => {
    if (!id) return;
    if (newStatus === 'active' && driver?.company_id) {
      const usageCheck = await checkCanAddOperator(driver.company_id);
      if (!usageCheck.allowed) {
        setShowUpgradeModal(true);
        toast({
          title: 'Upgrade required',
          description: usageCheck.message,
          variant: 'destructive',
        });
        return;
      }
    }
    updateStatus.mutate({ driverId: id, status: newStatus, reason });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-destructive">Driver not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/drivers')}>
          Back to Drivers
        </Button>
      </div>
    );
  }

  // Build avatar for header
  const avatar = (
    <UserAvatar
      src={avatarUrl}
      fullName={driver.user.full_name}
      email={driver.user.email}
      size="md"
    />
  );

  // Build badges
  // Single status badge
  const badges = (
    <Badge variant={driverStatusVariant[driver.status]}>
      {statusLabels[driver.status]}
    </Badge>
  );

  // Build subtitle - includes employment type
  const employmentLabel = driver.employment_type === '1099' ? '1099 Contractor' : 'W2 Employee';
  const subtitle = `${driver.user.email}${driver.user.phone ? ` • ${driver.user.phone}` : ''} • ${employmentLabel}`;

  // Build actions
  const actions = (
    <>
      <Button variant="outline" className="gap-2">
        <MessageSquare className="w-4 h-4" />
        Message
      </Button>
      <Button
        variant="outline"
        className="gap-2"
        disabled={!isAdmin}
        onClick={() => setEditOpen(true)}
      >
        <Edit className="w-4 h-4" />
        Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={!isAdmin}>
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {driver.status === 'active' && (
            <DropdownMenuItem onClick={() => void handleStatusChange('inactive')}>
              <XCircle className="w-4 h-4 mr-2" />
              Set Inactive
            </DropdownMenuItem>
          )}
          {driver.status === 'inactive' && (
            <DropdownMenuItem onClick={() => void handleStatusChange('active')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Set Active
            </DropdownMenuItem>
          )}
          {driver.status !== 'suspended' && (
            <DropdownMenuItem
              onClick={() => setSuspendOpen(true)}
              className="text-destructive"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Suspend Driver
            </DropdownMenuItem>
          )}
          {driver.status === 'suspended' && (
            <DropdownMenuItem onClick={() => void handleStatusChange('active')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Reactivate Driver
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void handleStatusChange('archived')}
            className="text-destructive"
          >
            <Archive className="w-4 h-4 mr-2" />
            Archive Driver
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  // Tab list for header
  const tabsList = (
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="profile">Profile</TabsTrigger>
      <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
      <TabsTrigger value="credentials">Credentials</TabsTrigger>
      <TabsTrigger value="availability" disabled>
        Availability
      </TabsTrigger>
    </TabsList>
  );

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="overview">
        {/* Full-width header with centered tabs */}
        <DetailPageHeader
          title={driver.user.full_name}
          subtitle={subtitle}
          badges={badges}
          avatar={avatar}
          onBack={() => navigate('/admin/drivers')}
          backLabel="Back to Drivers"
          centerContent={tabsList}
          actions={actions}
        />

        {/* Content area */}
        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <TabsContent value="overview" className="mt-0">
              <DriverOverviewTab driver={driver} canEdit={isAdmin} />
            </TabsContent>

            <TabsContent value="profile" className="mt-0">
              <DriverProfileTab driver={driver} />
            </TabsContent>

            <TabsContent value="vehicles" className="mt-0">
              <DriverVehiclesTab driver={driver} />
            </TabsContent>

            <TabsContent value="credentials" className="mt-0">
              <DriverCredentialsTab companyId={driver.company_id} driverId={driver.id} />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <EditDriverModal open={editOpen} onOpenChange={setEditOpen} driver={driver} />
      <SuspendDriverModal
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onConfirm={(reason) => {
          setSuspendOpen(false);
          void handleStatusChange('suspended', reason);
        }}
        isSubmitting={updateStatus.isPending}
      />
      {showUpgradeModal && (
        <UpgradeModal
          companyId={driver.company_id}
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          showTrigger={false}
        />
      )}
    </div>
  );
}
