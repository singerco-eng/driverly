// Realistic mock driver data for the website demo

export interface MockOnboardingItem {
  key: string;
  label: string;
  description: string;
  category: 'profile' | 'credentials' | 'vehicle';
  required: boolean;
  completed: boolean;
  missingInfo?: string[];
  route: string;
}

export interface MockOnboardingStatus {
  progress: number;
  isComplete: boolean;
  canActivate: boolean;
  items: MockOnboardingItem[];
  blockers: string[];
}

export interface MockDriver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'active' | 'inactive';
  employmentType: 'W2' | '1099';
  applicationStatus: 'approved';
  avatarInitials: string;
}

export const mockDriver: MockDriver = {
  id: 'driver-1',
  name: 'Marcus Johnson',
  email: 'marcus.j@email.com',
  phone: '(555) 123-4567',
  status: 'pending',
  employmentType: 'W2',
  applicationStatus: 'approved',
  avatarInitials: 'MJ',
};

export const mockOnboardingStatus: MockOnboardingStatus = {
  progress: 45,
  isComplete: false,
  canActivate: false,
  blockers: ['Complete required credentials', 'Add vehicle information'],
  items: [
    {
      key: 'personal_info',
      label: 'Personal Information',
      description: 'Add your full name, contact info, and address',
      category: 'profile',
      required: true,
      completed: true,
      route: '/driver/profile',
    },
    {
      key: 'drivers_license',
      label: "Driver's License",
      description: 'Upload your current driver license',
      category: 'profile',
      required: true,
      completed: true,
      route: '/driver/profile',
    },
    {
      key: 'background_check',
      label: 'Background Check',
      description: 'Complete authorization for background verification',
      category: 'credentials',
      required: true,
      completed: false,
      missingInfo: ['Authorization form not signed'],
      route: '/driver/credentials/1',
    },
    {
      key: 'drug_test',
      label: 'Drug & Alcohol Screening',
      description: 'Schedule and complete drug screening',
      category: 'credentials',
      required: true,
      completed: false,
      route: '/driver/credentials/2',
    },
    {
      key: 'hipaa_training',
      label: 'HIPAA Compliance Training',
      description: 'Complete patient privacy training module',
      category: 'credentials',
      required: true,
      completed: false,
      route: '/driver/credentials/3',
    },
    {
      key: 'vehicle_info',
      label: 'Vehicle Information',
      description: 'Add your vehicle details',
      category: 'vehicle',
      required: true,
      completed: false,
      missingInfo: ['No vehicle added'],
      route: '/driver/vehicles',
    },
    {
      key: 'vehicle_insurance',
      label: 'Vehicle Insurance',
      description: 'Upload proof of auto insurance',
      category: 'vehicle',
      required: true,
      completed: false,
      route: '/driver/vehicles',
    },
    {
      key: 'defensive_driving',
      label: 'Defensive Driving Course',
      description: 'Complete optional safety training',
      category: 'credentials',
      required: false,
      completed: false,
      route: '/driver/credentials/4',
    },
  ],
};

// For the demo - a completed onboarding status
export const mockCompletedOnboardingStatus: MockOnboardingStatus = {
  progress: 100,
  isComplete: true,
  canActivate: true,
  blockers: [],
  items: mockOnboardingStatus.items.map((item) => ({
    ...item,
    completed: true,
    missingInfo: undefined,
  })),
};

// Category labels matching your real app
export const CATEGORY_LABELS: Record<string, string> = {
  profile: 'Profile Setup',
  credentials: 'Required Credentials',
  vehicle: 'Vehicle Setup',
};
