import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDriver, useUpdateDriverStatus } from '@/hooks/useDrivers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
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
import { EditDriverModal } from '@/components/features/admin/EditDriverModal';
import { SuspendDriverModal } from '@/components/features/admin/SuspendDriverModal';
import { useAuth } from '@/contexts/AuthContext';
import type { DriverStatus } from '@/types/driver';

const statusStyles: Record<DriverStatus, string> = {
  active: 'bg-green-500/20 text-green-600 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
  suspended: 'bg-red-500/20 text-red-600 border-red-500/30',
  archived: 'bg-gray-400/20 text-gray-500 border-gray-400/30',
};

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: driver, isLoading, error } = useDriver(id || '');
  const updateStatus = useUpdateDriverStatus();
  const [editOpen, setEditOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const handleStatusChange = (newStatus: DriverStatus, reason?: string) => {
    if (!id) return;
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

  return (
    <div className="space-y-6">
      <Link
        to="/admin/drivers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Drivers
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-2xl font-medium">
              {driver.user.full_name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{driver.user.full_name}</h1>
              <Badge variant="outline" className={statusStyles[driver.status]}>
                {driver.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{driver.user.email}</p>
            <p className="text-sm text-muted-foreground">{driver.user.phone || '—'}</p>
            <Badge variant="secondary" className="mt-2">
              {driver.employment_type.toUpperCase()}{' '}
              {driver.employment_type === '1099' ? 'Contractor' : 'Employee'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                <DropdownMenuItem onClick={() => handleStatusChange('inactive')}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Set Inactive
                </DropdownMenuItem>
              )}
              {driver.status === 'inactive' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
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
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Reactivate Driver
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleStatusChange('archived')}
                className="text-destructive"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive Driver
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="credentials" disabled>
            Credentials
          </TabsTrigger>
          <TabsTrigger value="availability" disabled>
            Availability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <DriverOverviewTab driver={driver} canEdit={isAdmin} />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <DriverProfileTab driver={driver} />
        </TabsContent>

        <TabsContent value="vehicles" className="mt-6">
          <DriverVehiclesTab driver={driver} />
        </TabsContent>
      </Tabs>

      <EditDriverModal open={editOpen} onOpenChange={setEditOpen} driver={driver} />
      <SuspendDriverModal
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onConfirm={(reason) => {
          setSuspendOpen(false);
          handleStatusChange('suspended', reason);
        }}
        isSubmitting={updateStatus.isPending}
      />
    </div>
  );
}
