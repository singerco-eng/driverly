import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, CheckCircle2, AlertTriangle, Clock, Zap, Lock, Eye, MapPin, Car, Users } from 'lucide-react';
import type { Broker, DriverBrokerAssignment, VehicleType } from '@/types/broker';
import { getSourceTypeLabel } from '@/types/broker';

const vehicleTypeLabels: Record<VehicleType, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  minivan: 'Minivan',
  wheelchair_van: 'Wheelchair Van',
  stretcher_van: 'Stretcher Van',
};

type JoinMode = 'auto_signup' | 'request' | 'admin_only' | 'not_eligible';

interface TripSourceCardProps {
  broker: Broker;
  assignment?: DriverBrokerAssignment;
  eligibility?: { eligible: boolean; issues: string[] };
  joinInfo?: { can_join: boolean; join_mode: JoinMode; reason: string };
  credentialCount?: number;
  onViewDetails: () => void;
}

export function TripSourceCard({
  broker,
  assignment,
  eligibility,
  joinInfo,
  credentialCount,
  onViewDetails,
}: TripSourceCardProps) {
  const assignmentStatus = assignment?.status;
  const isAssigned = assignmentStatus === 'assigned';
  const isPendingRequest = assignmentStatus === 'pending';
  const joinMode = joinInfo?.join_mode;

  const getStatusBadge = () => {
    if (isAssigned) {
      if (eligibility?.eligible) {
        return { label: 'Eligible', variant: 'default' as const, icon: CheckCircle2 };
      }
      return { label: 'Ineligible', variant: 'secondary' as const, icon: AlertTriangle };
    }

    if (isPendingRequest) {
      return { label: 'Pending', variant: 'secondary' as const, icon: Clock };
    }

    if (joinMode === 'auto_signup') {
      return { label: 'Auto-Signup', variant: 'default' as const, icon: Zap };
    }

    if (joinMode === 'admin_only') {
      return { label: 'Admin Only', variant: 'outline' as const, icon: Lock };
    }

    if (joinMode === 'not_eligible') {
      return { label: 'Not Eligible', variant: 'outline' as const, icon: null };
    }

    // Default: Available to join via request
    return { label: 'Available', variant: 'outline' as const, icon: null };
  };

  const getStatusMessage = () => {
    if (isAssigned) {
      if (eligibility?.eligible) {
        return 'All credentials complete';
      }
      if (eligibility?.issues.length) {
        return `Requirements: ${eligibility.issues.join(', ')}`;
      }
      return 'Additional requirements needed';
    }

    if (isPendingRequest) {
      return `Requested ${new Date(assignment!.requested_at).toLocaleDateString()}`;
    }

    if (joinMode === 'admin_only') {
      return 'Contact your admin for assignment';
    }

    if (joinMode === 'not_eligible') {
      return joinInfo?.reason || 'Not eligible to join';
    }

    if (typeof credentialCount === 'number') {
      return `${credentialCount} additional credential${credentialCount === 1 ? '' : 's'} required`;
    }

    return 'View requirements to get started';
  };

  const statusBadge = getStatusBadge();
  const vehicleTypes = broker.accepted_vehicle_types
    .map((type) => vehicleTypeLabels[type] || type)
    .join(', ');

  return (
    <Card className="h-full flex flex-col hover:shadow-soft transition-all">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header row with badge */}
        <div className="flex items-center justify-between">
          <Badge variant={statusBadge.variant}>
            {statusBadge.icon && <statusBadge.icon className="w-3 h-3 mr-1" />}
            {statusBadge.label}
          </Badge>
        </div>

        {/* Centered logo and broker info */}
        <div 
          className="flex flex-col items-center text-center cursor-pointer"
          onClick={onViewDetails}
        >
          {/* Broker Logo */}
          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center mb-2">
            {broker.logo_url ? (
              <img src={broker.logo_url} alt={broker.name} className="h-12 w-12 object-contain" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Broker Name */}
          <h3 className="font-semibold">{broker.name}</h3>

          {/* Source Type */}
          <p className="text-sm text-muted-foreground">
            {getSourceTypeLabel(broker.source_type)}
          </p>

          {/* Service States */}
          {broker.service_states.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {broker.service_states.length > 3
                  ? `${broker.service_states.slice(0, 3).join(', ')}...`
                  : broker.service_states.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Status Message */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>{getStatusMessage()}</span>
          </div>

          {/* Vehicle Types */}
          {vehicleTypes && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="h-4 w-4 shrink-0" />
              <span>{vehicleTypes}</span>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Button */}
        <Button variant="outline" size="sm" className="w-full mt-auto" onClick={onViewDetails}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
