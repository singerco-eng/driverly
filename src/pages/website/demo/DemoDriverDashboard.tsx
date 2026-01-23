/**
 * Demo Driver Dashboard
 * 
 * This renders the REAL driver components with mock data.
 * It will look identical to the actual app because it IS the actual app components.
 */

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Car, Calendar, Sparkles } from 'lucide-react';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';

// Import REAL components
import { GettingStartedChecklist } from '@/components/features/driver/GettingStartedChecklist';
import { DriverStatusToggle } from '@/components/features/driver/DriverStatusToggle';

// Import REAL types
import type { OnboardingStatus, OnboardingItemStatus, OnboardingCategory, OnboardingItemKey } from '@/types/onboarding';

// ============================================
// MOCK DATA - Matches exact TypeScript types
// ============================================

const mockOnboardingItems: OnboardingItemStatus[] = [
  {
    key: 'profile_complete' as OnboardingItemKey,
    label: 'Complete Your Profile',
    description: 'Add your personal information, contact details, and address',
    required: true,
    category: 'setup' as OnboardingCategory,
    route: '/driver/profile',
    completed: true,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    skipped: false,
  },
  {
    key: 'profile_photo' as OnboardingItemKey,
    label: 'Upload Profile Photo',
    description: 'Add a professional photo for your driver profile',
    required: false,
    category: 'setup' as OnboardingCategory,
    route: '/driver/profile',
    completed: true,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    skipped: false,
  },
  {
    key: 'global_credentials' as OnboardingItemKey,
    label: 'Background Check',
    description: 'Complete authorization for background verification',
    required: true,
    category: 'credentials' as OnboardingCategory,
    route: '/driver/credentials',
    completed: false,
    completedAt: null,
    skipped: false,
    missingInfo: ['Authorization form not signed'],
  },
  {
    key: 'global_credentials' as OnboardingItemKey,
    label: 'Drug & Alcohol Screening',
    description: 'Schedule and complete drug screening at an approved facility',
    required: true,
    category: 'credentials' as OnboardingCategory,
    route: '/driver/credentials',
    completed: false,
    completedAt: null,
    skipped: false,
  },
  {
    key: 'global_credentials' as OnboardingItemKey,
    label: 'HIPAA Compliance Training',
    description: 'Complete patient privacy training module and certification',
    required: true,
    category: 'credentials' as OnboardingCategory,
    route: '/driver/credentials',
    completed: false,
    completedAt: null,
    skipped: false,
  },
  {
    key: 'vehicle_added' as OnboardingItemKey,
    label: 'Add Your Vehicle',
    description: 'Add your vehicle information including make, model, and year',
    required: true,
    category: 'setup' as OnboardingCategory,
    route: '/driver/vehicles',
    completed: false,
    completedAt: null,
    skipped: false,
    missingInfo: ['No vehicle added yet'],
  },
  {
    key: 'vehicle_complete' as OnboardingItemKey,
    label: 'Vehicle Insurance',
    description: 'Upload proof of auto liability insurance',
    required: true,
    category: 'setup' as OnboardingCategory,
    route: '/driver/vehicles',
    completed: false,
    completedAt: null,
    skipped: false,
  },
  {
    key: 'availability_set' as OnboardingItemKey,
    label: 'Set Your Availability',
    description: 'Let us know when you\'re available to drive',
    required: false,
    category: 'schedule' as OnboardingCategory,
    route: '/driver/availability',
    completed: false,
    completedAt: null,
    skipped: false,
  },
];

const mockOnboardingStatus: OnboardingStatus = {
  items: mockOnboardingItems,
  progress: 25,
  isComplete: false,
  canActivate: false,
  blockers: ['Complete required credentials', 'Add vehicle information'],
};

const mockDriver = {
  id: 'driver-demo',
  name: 'Marcus Johnson',
  status: 'pending' as const,
};

const mockCompany = {
  name: 'Acme Medical Transport',
};

interface DemoDriverDashboardProps {
  embedded?: boolean; // When true, skip iframe check (rendered inline on homepage)
}

export default function DemoDriverDashboard({ embedded = false }: DemoDriverDashboardProps) {
  // Redirect to website if accessed directly (not embedded or in iframe)
  useEffect(() => {
    if (embedded) return; // Skip check if rendered inline
    const isInIframe = window.self !== window.top;
    if (!isInIframe) {
      window.location.href = '/website';
    }
  }, [embedded]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            {greeting}, {mockDriver.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome to {mockCompany.name}.
          </p>
        </div>

        {/* Status Toggle - Using REAL component */}
        <DriverStatusToggle
          driverId={mockDriver.id}
          currentStatus={mockDriver.status}
          canActivate={mockOnboardingStatus.canActivate}
          blockers={mockOnboardingStatus.blockers}
        />

        {/* Getting Started Checklist - Using REAL component */}
        <GettingStartedChecklist onboardingStatus={mockOnboardingStatus} />

        {/* Quick Actions Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className={cn(cardVariants({ variant: 'default' }))}>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Jump to the most common tasks.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start gap-2">
                <FileCheck className="w-4 h-4" />
                Manage Credentials
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <Car className="w-4 h-4" />
                Manage Vehicles
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <Calendar className="w-4 h-4" />
                Edit Availability
              </Button>
            </CardContent>
          </Card>

          <Card className={cn(cardVariants({ variant: 'default' }))}>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Trip activity will appear here soon.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No activity to show yet.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
