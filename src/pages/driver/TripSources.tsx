import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterBar } from '@/components/ui/filter-bar';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useOnboardingStatus } from '@/hooks/useOnboarding';
import { useDriverCredentials } from '@/hooks/useCredentials';
import { useOwnedVehicles, useAssignedVehicles } from '@/hooks/useDriverVehicles';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import {
  useAutoJoinBroker,
  useCancelBrokerRequest,
  useDriverBrokers,
  useRequestBrokerAssignment,
} from '@/hooks/useDriverBrokers';
import * as brokerService from '@/services/brokers';
import * as credentialService from '@/services/credentials';
import type { Broker, DriverBrokerAssignment } from '@/types/broker';
import type { CredentialWithDisplayStatus } from '@/types/credential';
import type { DriverVehicle } from '@/types/driverVehicle';
import { SOURCE_TYPE_CONFIG } from '@/types/broker';
import { TripSourceCard } from '@/components/features/driver/TripSourceCard';
import { GlobalCredentialsGate } from '@/components/features/driver/GlobalCredentialsGate';
import { TripSourceDetailsModal } from '@/components/features/driver/TripSourceDetailsModal';
import { RequestBrokerModal } from '@/components/features/driver/RequestBrokerModal';
import { JoinBrokerModal } from '@/components/features/driver/JoinBrokerModal';
import { CancelRequestModal } from '@/components/features/driver/CancelRequestModal';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/lib/design-system';
import { isCredentialLiveForDrivers } from '@/lib/credentialRequirements';

type JoinMode = 'auto_signup' | 'request' | 'admin_only' | 'not_eligible';

interface JoinInfo {
  can_join: boolean;
  join_mode: JoinMode;
  reason: string;
}

type EmploymentType = 'w2' | '1099';

export default function TripSources() {
  const { user, profile } = useAuth();
  const { data: driver, isLoading: driverLoading } = useDriverByUserId(user?.id);
  const driverId = driver?.id;
  const companyId = profile?.company_id;

  const { data: onboardingStatus, isLoading: onboardingLoading } = useOnboardingStatus(driverId);
  const { data: driverCredentials = [], isLoading: credentialsLoading } = useDriverCredentials(driverId);
  const { data: credentialTypes = [] } = useCredentialTypes(companyId);

  const { data: ownedVehicles = [] } = useOwnedVehicles(driverId);
  const { data: assignedVehicles = [] } = useAssignedVehicles(driverId);
  const vehicles = driver?.employment_type === '1099' ? ownedVehicles : assignedVehicles;

  const vehicleCredentialQueries = useQueries({
    queries: vehicles.map((vehicle) => ({
      queryKey: ['vehicle-credentials', vehicle.id],
      queryFn: () => credentialService.getVehicleCredentials(vehicle.id),
      enabled: !!vehicle.id,
    })),
  });

  const vehicleCredentialsById = useMemo(() => {
    const map: Record<string, CredentialWithDisplayStatus[]> = {};
    vehicles.forEach((vehicle, index) => {
      map[vehicle.id] = vehicleCredentialQueries[index]?.data || [];
    });
    return map;
  }, [vehicles, vehicleCredentialQueries]);

  const { data: driverBrokers, isLoading: brokersLoading } = useDriverBrokers(driverId, companyId);
  const brokers = driverBrokers?.brokers ?? [];
  const assignments = driverBrokers?.assignments ?? [];

  const requestAssignment = useRequestBrokerAssignment();
  const autoJoinBroker = useAutoJoinBroker();
  const cancelRequest = useCancelBrokerRequest();

  const [activeTab, setActiveTab] = useState('assigned');
  const [filters, setFilters] = useState({ search: '', type: 'all' });

  const [detailsBrokerId, setDetailsBrokerId] = useState<string | null>(null);
  const [requestBrokerId, setRequestBrokerId] = useState<string | null>(null);
  const [joinBrokerId, setJoinBrokerId] = useState<string | null>(null);
  const [cancelBrokerId, setCancelBrokerId] = useState<string | null>(null);

  const assignmentByBroker = useMemo(() => {
    const map = new Map<string, DriverBrokerAssignment>();
    assignments.forEach((assignment) => {
      map.set(assignment.broker_id, assignment);
    });
    return map;
  }, [assignments]);

  const assignedBrokers = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.status === 'assigned')
        .map((assignment) => ({
          broker: brokers.find((b) => b.id === assignment.broker_id),
          assignment,
        }))
        .filter((item) => item.broker) as { broker: Broker; assignment: DriverBrokerAssignment }[],
    [assignments, brokers],
  );

  const pendingBrokers = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.status === 'pending')
        .map((assignment) => ({
          broker: brokers.find((b) => b.id === assignment.broker_id),
          assignment,
        }))
        .filter((item) => item.broker) as { broker: Broker; assignment: DriverBrokerAssignment }[],
    [assignments, brokers],
  );

  const availableBrokers = useMemo(() => {
    if (!driver) return [];
    return brokers.filter(
      (broker) =>
        !assignmentByBroker.has(broker.id) &&
        broker.accepted_employment_types.includes(driver.employment_type),
    );
  }, [brokers, assignmentByBroker, driver]);

  const joinQueries = useQueries({
    queries: availableBrokers.map((broker) => ({
      queryKey: ['driver-broker-join', driverId, broker.id],
      queryFn: () => brokerService.canDriverJoinBroker(driverId!, broker.id),
      enabled: !!driverId,
    })),
  });

  const joinInfoByBroker = useMemo(() => {
    const map = new Map<string, JoinInfo>();
    availableBrokers.forEach((broker, index) => {
      const data = joinQueries[index]?.data;
      if (data) {
        map.set(broker.id, data);
      }
    });
    return map;
  }, [availableBrokers, joinQueries]);

  const credentialCountByBroker = useMemo(() => {
    const map = new Map<string, number>();
    credentialTypes.forEach((type) => {
      if (
        type.scope !== 'broker' ||
        !type.broker_id ||
        type.requirement !== 'required' ||
        !isCredentialLiveForDrivers(type)
      ) {
        return;
      }
      map.set(type.broker_id, (map.get(type.broker_id) || 0) + 1);
    });
    return map;
  }, [credentialTypes]);

  const eligibilityByBroker = useMemo(() => {
    if (!driver) return new Map<string, { eligible: boolean; issues: string[] }>();
    const map = new Map<string, { eligible: boolean; issues: string[] }>();

    const matchesEmploymentType = (type: CredentialWithDisplayStatus['credentialType']['employment_type']) => {
      if (type === 'both') return true;
      if (type === 'w2_only') return driver.employment_type === 'w2';
      if (type === '1099_only') return driver.employment_type === '1099';
      return true;
    };

    assignedBrokers.forEach(({ broker }) => {
      const issues: string[] = [];

      if (!broker.accepted_employment_types.includes(driver.employment_type)) {
        issues.push(`Employment type (${driver.employment_type}) not accepted`);
      }
      if (broker.service_states.length > 0 && driver.state && !broker.service_states.includes(driver.state)) {
        issues.push(`Not in service area (${driver.state})`);
      }

      const globalDriverCreds = driverCredentials.filter(
        (cred) =>
          cred.credentialType.scope === 'global' &&
          cred.credentialType.category === 'driver' &&
          cred.credentialType.requirement === 'required' &&
          isCredentialLiveForDrivers(cred.credentialType) &&
          matchesEmploymentType(cred.credentialType.employment_type),
      );
      const missingGlobal = globalDriverCreds.filter((cred) => cred.displayStatus !== 'approved');
      if (missingGlobal.length > 0) {
        issues.push(`${missingGlobal.length} global credential${missingGlobal.length === 1 ? '' : 's'} missing`);
      }

      const brokerDriverCreds = driverCredentials.filter(
        (cred) =>
          cred.credentialType.scope === 'broker' &&
          cred.credentialType.broker?.id === broker.id &&
          cred.credentialType.category === 'driver' &&
          cred.credentialType.requirement === 'required' &&
          isCredentialLiveForDrivers(cred.credentialType) &&
          matchesEmploymentType(cred.credentialType.employment_type),
      );
      const missingBroker = brokerDriverCreds.filter((cred) => cred.displayStatus !== 'approved');
      if (missingBroker.length > 0) {
        issues.push(`${missingBroker.length} ${broker.name} credential${missingBroker.length === 1 ? '' : 's'} missing`);
      }

      const requiredVehicleTypes = credentialTypes.filter(
        (type) =>
          type.category === 'vehicle' &&
          type.requirement === 'required' &&
          isCredentialLiveForDrivers(type) &&
          (type.employment_type === 'both' ||
            (type.employment_type === 'w2_only' && driver.employment_type === 'w2') ||
            (type.employment_type === '1099_only' && driver.employment_type === '1099')) &&
          (type.scope === 'global' || type.broker_id === broker.id),
      );

      const hasEligibleVehicle = vehicles.some((vehicle) => {
        if (vehicle.status !== 'active') return false;
        if (!broker.accepted_vehicle_types.includes(vehicle.vehicle_type)) return false;
        const vehicleCreds = vehicleCredentialsById[vehicle.id] || [];
        const missingVehicleCreds = requiredVehicleTypes.filter((type) => {
          if (type.vehicle_types && type.vehicle_types.length > 0 && !type.vehicle_types.includes(vehicle.vehicle_type)) {
            return false;
          }
          const match = vehicleCreds.find((cred) => cred.credentialType.id === type.id);
          return !match || match.displayStatus !== 'approved';
        });
        return missingVehicleCreds.length === 0;
      });

      if (!hasEligibleVehicle) {
        issues.push('No eligible vehicle');
      }

      map.set(broker.id, { eligible: issues.length === 0, issues });
    });

    return map;
  }, [
    assignedBrokers,
    credentialTypes,
    driver,
    driverCredentials,
    vehicleCredentialsById,
    vehicles,
  ]);

  // Get raw blockers from onboarding status
  const rawBlockers = onboardingStatus?.blockers ?? [];
  const vehicleBlockerSet = new Set([
    'Add a Vehicle',
    'Complete Vehicle Information',
    'Active vehicle with required credentials',
  ]);

  // Check credential statuses to differentiate "submit" vs "waiting on review"
  const globalDriverCreds = driverCredentials.filter(
    (cred) =>
      cred.credentialType.scope === 'global' &&
      cred.credentialType.category === 'driver' &&
      cred.credentialType.requirement === 'required' &&
      isCredentialLiveForDrivers(cred.credentialType)
  );
  
  const pendingReviewCreds = globalDriverCreds.filter(
    (cred) => cred.displayStatus === 'pending_review' || cred.displayStatus === 'awaiting'
  );
  const notSubmittedCreds = globalDriverCreds.filter(
    (cred) => cred.displayStatus === 'not_submitted' || cred.displayStatus === 'rejected'
  );

  // Replace generic credential blocker with specific messaging
  const driverBlockers = rawBlockers
    .filter((blocker) => !vehicleBlockerSet.has(blocker))
    .flatMap((blocker) => {
      if (blocker === 'Submit Required Credentials') {
        const result: string[] = [];
        if (notSubmittedCreds.length > 0) {
          result.push(`Submit ${notSubmittedCreds.length} required credential${notSubmittedCreds.length === 1 ? '' : 's'}`);
        }
        if (pendingReviewCreds.length > 0) {
          result.push(`Waiting on review (${pendingReviewCreds.length} credential${pendingReviewCreds.length === 1 ? '' : 's'})`);
        }
        return result.length > 0 ? result : [blocker];
      }
      return [blocker];
    });

  const vehicleBlockers = rawBlockers.filter((blocker) => vehicleBlockerSet.has(blocker));
  const employmentType = (driver?.employment_type ?? '1099') as EmploymentType;

  const applyFilters = (broker: Broker) => {
    const matchesSearch =
      !filters.search || broker.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesType = filters.type === 'all' || broker.source_type === filters.type;
    return matchesSearch && matchesType;
  };

  const filteredAssigned = assignedBrokers.filter(({ broker }) => applyFilters(broker));
  const filteredPending = pendingBrokers.filter(({ broker }) => applyFilters(broker));
  const filteredAvailable = availableBrokers.filter((broker) => applyFilters(broker));

  const detailsBroker = brokers.find((b) => b.id === detailsBrokerId) || null;
  const detailsAssignment = detailsBrokerId ? assignmentByBroker.get(detailsBrokerId) : undefined;
  const detailsJoinInfo = detailsBrokerId ? joinInfoByBroker.get(detailsBrokerId) : undefined;

  const requestBroker = brokers.find((b) => b.id === requestBrokerId) || null;
  const joinBroker = brokers.find((b) => b.id === joinBrokerId) || null;
  const cancelBroker = brokers.find((b) => b.id === cancelBrokerId) || null;

  const handleRequest = async (brokerId: string) => {
    if (!driverId) return;
    try {
      await requestAssignment.mutateAsync({ driverId, brokerId });
      setRequestBrokerId(null);
    } catch {
      // handled by toast
    }
  };

  const handleJoin = async (brokerId: string) => {
    if (!driverId) return;
    try {
      await autoJoinBroker.mutateAsync({ driverId, brokerId });
      setJoinBrokerId(null);
    } catch {
      // handled by toast
    }
  };

  const handleCancel = async (brokerId: string) => {
    const assignment = assignmentByBroker.get(brokerId);
    if (!assignment || !driverId) return;
    try {
      await cancelRequest.mutateAsync({ assignmentId: assignment.id, driverId });
      setCancelBrokerId(null);
    } catch {
      // handled by toast
    }
  };

  if (driverLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Tabs for the header
  const tabsList = (
    <TabsList>
      <TabsTrigger value="assigned">Assigned ({filteredAssigned.length})</TabsTrigger>
      <TabsTrigger value="pending">Pending ({filteredPending.length})</TabsTrigger>
      <TabsTrigger value="available">Available ({filteredAvailable.length})</TabsTrigger>
    </TabsList>
  );

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Full-width header */}
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: title */}
              <div className="flex-1">
                <h1 className="text-xl font-bold">My Trip Sources</h1>
                <p className="text-sm text-muted-foreground">
                  View and manage your trip source assignments.
                </p>
              </div>

              {/* Center: tabs (only show when driver is ready) */}
              {(driver?.status === 'active' || onboardingStatus?.canActivate) && (
                <div className="flex items-center justify-center">
                  {tabsList}
                </div>
              )}

              {/* Right: placeholder for balance */}
              <div className="flex-1" />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {!(driver?.status === 'active' || onboardingStatus?.canActivate) ? (
              <GlobalCredentialsGate
                employmentType={employmentType}
                driverBlockers={driverBlockers}
                vehicleBlockers={vehicleBlockers}
              />
            ) : (
              <>
                <Card className={cn(cardVariants({ variant: 'stats', padding: 'sm' }))}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Global credentials complete</p>
                      <p className="text-xs text-muted-foreground">
                        You can now request trip source assignments.
                      </p>
                    </div>
                    <Badge variant="secondary">{driver?.employment_type?.toUpperCase()}</Badge>
                  </div>
                </Card>

                {/* Filter bar */}
                <FilterBar
                  searchValue={filters.search}
                  onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                  searchPlaceholder="Search trip sources..."
                  filters={[
                    {
                      value: filters.type,
                      onValueChange: (value) => setFilters((prev) => ({ ...prev, type: value })),
                      label: 'Type',
                      placeholder: 'All Types',
                      options: [
                        { value: 'all', label: 'All Types' },
                        ...Object.entries(SOURCE_TYPE_CONFIG).map(([value, config]) => ({
                          value,
                          label: config.label,
                        })),
                      ],
                    },
                  ]}
                />

                <TabsContent value="assigned" className="mt-0">
                  {brokersLoading || credentialsLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : filteredAssigned.length === 0 ? (
                    <Card className="p-10 text-center text-muted-foreground">
                      No assigned trip sources yet.
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredAssigned.map(({ broker, assignment }) => (
                        <TripSourceCard
                          key={broker.id}
                          broker={broker}
                          assignment={assignment}
                          eligibility={eligibilityByBroker.get(broker.id)}
                          onViewDetails={() => setDetailsBrokerId(broker.id)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pending" className="mt-0 space-y-4">
                  {filteredPending.length === 0 ? (
                    <Card className="p-10 text-center text-muted-foreground space-y-4">
                      <p>No pending requests.</p>
                      <Button variant="outline" onClick={() => setActiveTab('available')}>
                        View Available
                      </Button>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredPending.map(({ broker, assignment }) => (
                        <TripSourceCard
                          key={broker.id}
                          broker={broker}
                          assignment={assignment}
                          onViewDetails={() => setDetailsBrokerId(broker.id)}
                        />
                      ))}
                    </div>
                  )}
                  {filteredPending.length > 0 && (
                    <Card className="p-4 text-sm text-muted-foreground">
                      Your admin will review your request and either approve or deny it. Once approved,
                      you&apos;ll see the trip source in your Assigned tab.
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="available" className="mt-0">
                  {filteredAvailable.length === 0 ? (
                    <Card className="p-10 text-center text-muted-foreground">
                      No available trip sources match your filters.
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredAvailable.map((broker) => (
                        <TripSourceCard
                          key={broker.id}
                          broker={broker}
                          joinInfo={joinInfoByBroker.get(broker.id)}
                          credentialCount={credentialCountByBroker.get(broker.id) || 0}
                          onViewDetails={() => setDetailsBrokerId(broker.id)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </div>
      </Tabs>

      <TripSourceDetailsModal
        open={!!detailsBroker}
        onOpenChange={(open) => !open && setDetailsBrokerId(null)}
        broker={detailsBroker}
        driverState={driver?.state}
        driverEmploymentType={driver?.employment_type as EmploymentType | undefined}
        vehicles={vehicles as DriverVehicle[]}
        vehicleCredentialsById={vehicleCredentialsById}
        driverCredentials={driverCredentials}
        credentialTypes={credentialTypes}
        assignmentStatus={detailsAssignment?.status}
        joinInfo={detailsJoinInfo}
        onRequest={detailsBroker ? () => setRequestBrokerId(detailsBroker.id) : undefined}
        onJoin={detailsBroker ? () => setJoinBrokerId(detailsBroker.id) : undefined}
        isSubmitting={requestAssignment.isPending || autoJoinBroker.isPending}
      />

      <RequestBrokerModal
        open={!!requestBroker}
        onOpenChange={(open) => !open && setRequestBrokerId(null)}
        broker={requestBroker}
        credentialCount={requestBroker ? credentialCountByBroker.get(requestBroker.id) || 0 : 0}
        onConfirm={() => requestBroker && handleRequest(requestBroker.id)}
        isSubmitting={requestAssignment.isPending}
      />

      <JoinBrokerModal
        open={!!joinBroker}
        onOpenChange={(open) => !open && setJoinBrokerId(null)}
        broker={joinBroker}
        credentialCount={joinBroker ? credentialCountByBroker.get(joinBroker.id) || 0 : 0}
        onConfirm={() => joinBroker && handleJoin(joinBroker.id)}
        isSubmitting={autoJoinBroker.isPending}
      />

      <CancelRequestModal
        open={!!cancelBroker}
        onOpenChange={(open) => !open && setCancelBrokerId(null)}
        broker={cancelBroker}
        onConfirm={() => cancelBroker && handleCancel(cancelBroker.id)}
        isSubmitting={cancelRequest.isPending}
      />
    </div>
  );
}
