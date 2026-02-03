import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Briefcase, Calendar } from 'lucide-react';
import { applicationStatusConfig } from '@/lib/status-configs';
import type { ApplicationStatus } from '@/types/driver';

interface ApplicationCardProps {
  application: {
    id: string;
    user: {
      full_name: string;
      email: string;
    };
    employment_type: string;
    application_status: ApplicationStatus;
    application_submitted_at?: string | null;
  };
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const navigate = useNavigate();
  const status = applicationStatusConfig[application.application_status];
  
  const initials = application.user.full_name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const handleClick = () => {
    navigate(`/admin/applications/${application.id}`);
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-soft transition-all">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header row with badge */}
        <div className="flex items-center justify-between">
          <Badge variant={status.variant}>
            {status.label}
          </Badge>
        </div>

        {/* Centered avatar and applicant info */}
        <div 
          className="flex flex-col items-center text-center cursor-pointer"
          onClick={handleClick}
        >
          {/* Avatar with initials */}
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-2">
            <span className="text-primary font-semibold text-lg">{initials}</span>
          </div>

          {/* Applicant Name */}
          <h3 className="font-semibold">{application.user.full_name}</h3>

          {/* Email */}
          <p className="text-sm text-muted-foreground">{application.user.email}</p>
        </div>

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Employment Type */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4 shrink-0" />
            <span>{application.employment_type === 'w2' ? 'W2 Employee' : '1099 Contractor'}</span>
          </div>

          {/* Submitted Date */}
          {application.application_submitted_at && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Submitted {new Date(application.application_submitted_at).toLocaleDateString()}</span>
            </div>
          )}
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
