import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, 
  Eye, 
  MapPin, 
  Users, 
  FileCheck,
  Lock,
  UserPlus,
  Zap,
  Hospital,
  Shield,
  User,
  Briefcase,
} from 'lucide-react';
import type { BrokerWithStats, BrokerStatus, BrokerAssignmentMode, TripSourceType } from '@/types/broker';
import { getBrokerAssignmentMode, getAssignmentModeLabel, getSourceTypeLabel } from '@/types/broker';

interface BrokerCardProps {
  broker: BrokerWithStats;
}

/** Status config using native Badge variants per design system */
const statusConfig: Record<BrokerStatus, { 
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  active: { label: 'Active', badgeVariant: 'default' },
  inactive: { label: 'Inactive', badgeVariant: 'secondary' },
};

/** Assignment mode icons */
const assignmentModeIcons: Record<BrokerAssignmentMode, React.ElementType> = {
  admin_only: Lock,
  driver_requests: UserPlus,
  driver_auto_signup: Zap,
};

const sourceTypeIcons: Record<TripSourceType, React.ElementType> = {
  state_broker: Building2,
  facility: Hospital,
  insurance: Shield,
  private: User,
  corporate: Briefcase,
};

export function BrokerCard({ broker }: BrokerCardProps) {
  const navigate = useNavigate();
  const status = statusConfig[broker.status];
  const assignmentMode = getBrokerAssignmentMode(broker);
  const AssignmentIcon = assignmentModeIcons[assignmentMode];
  const SourceIcon = sourceTypeIcons[broker.source_type] || Building2;

  const handleClick = () => {
    navigate(`/admin/brokers/${broker.id}`);
  };

  return (
    <Card className={`h-full flex flex-col hover:shadow-soft transition-all ${
      broker.status === 'inactive' ? 'opacity-60' : ''
    }`}>
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header row with badge */}
        <div className="flex items-center justify-between">
          <Badge variant={status.badgeVariant}>
            {status.label}
          </Badge>
        </div>

        {/* Centered logo and broker info */}
        <div 
          className="flex flex-col items-center text-center cursor-pointer"
          onClick={handleClick}
        >
          {/* Broker Logo */}
          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center mb-2">
            {broker.logo_url ? (
              <img
                src={broker.logo_url}
                alt={broker.name}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Broker Name */}
          <h3 className="font-semibold">{broker.name}</h3>

          {/* Source Type */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <SourceIcon className="h-3.5 w-3.5" />
            <span>{getSourceTypeLabel(broker.source_type)}</span>
          </div>
        </div>

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Assignment Mode */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <AssignmentIcon className="h-4 w-4 shrink-0" />
            <span>{getAssignmentModeLabel(assignmentMode)}</span>
          </div>

          {/* Service States */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>
              {broker.service_states.length > 0
                ? broker.service_states.length > 4
                  ? `${broker.service_states.slice(0, 4).join(', ')}...`
                  : broker.service_states.join(', ')
                : 'No service area set'}
            </span>
          </div>

          {/* Driver Count */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>
              {broker.assigned_count} driver{broker.assigned_count !== 1 ? 's' : ''}
              {broker.pending_count > 0 && ` · ${broker.pending_count} pending`}
            </span>
          </div>

          {/* Credential Count */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCheck className="h-4 w-4 shrink-0" />
            <span>{broker.credential_type_count} credential type{broker.credential_type_count !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Button */}
        <Button variant="outline" size="sm" className="w-full mt-auto" onClick={handleClick}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
