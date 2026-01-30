import type { OnboardingItem } from '@/types/onboarding';

/**
 * Core onboarding items for the Getting Started checklist.
 * Focused on global credentials and essential setup.
 * Trip source/broker credentials are handled separately after onboarding is complete.
 */
export const ONBOARDING_ITEMS: OnboardingItem[] = [
  {
    key: 'profile_complete',
    label: 'Complete Your Profile',
    description: 'Verify your personal information',
    required: true,
    category: 'setup',
    route: '/driver/profile',
  },
  {
    key: 'profile_photo',
    label: 'Add Profile Photo',
    description: 'Add a professional photo',
    required: true,
    category: 'setup',
    route: '/driver/profile',
  },
  {
    key: 'vehicle_added',
    label: 'Add a Vehicle',
    description: 'Add vehicle details and photos',
    required: true,
    category: 'vehicle',
    forEmploymentType: '1099',
    route: '/driver/vehicles',
  },
  {
    key: 'vehicle_complete',
    label: 'Complete Vehicle Information',
    description: 'Add VIN, photos, and documentation',
    required: true,
    category: 'vehicle',
    forEmploymentType: '1099',
    route: '/driver/vehicles',
  },
  {
    key: 'global_credentials',
    label: 'Submit Required Credentials',
    description: 'Upload required documents',
    required: true,
    category: 'credentials',
    route: '/driver/credentials',
  },
  {
    key: 'availability_set',
    label: 'Set Your Availability',
    description: 'Tell us when you can drive',
    required: true,
    category: 'schedule',
    route: '/driver/availability',
  },
  {
    key: 'payment_info',
    label: 'Add Payment Information',
    description: 'Set up how to receive payments',
    required: true,
    category: 'payment',
    route: '/driver/settings/payment',
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  setup: 'Profile',
  vehicle: 'Vehicle',
  credentials: 'Credentials',
  schedule: 'Schedule',
  payment: 'Payment',
};
