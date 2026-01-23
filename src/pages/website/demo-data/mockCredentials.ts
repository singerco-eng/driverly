// Realistic mock credential data for the website demo

export interface MockCredentialType {
  id: string;
  name: string;
  description: string;
  category: 'driver' | 'vehicle';
  broker?: { name: string };
  stepCount: number;
}

export interface MockCredential {
  id: string;
  credentialType: MockCredentialType;
  status: 'pending_review' | 'approved' | 'rejected' | 'awaiting_verification' | 'not_submitted';
  submittedAt: string | null;
  expiresAt: string | null;
  progress: number;
  driver?: {
    name: string;
    initials: string;
    type: 'W2' | '1099';
  };
  vehicle?: {
    make: string;
    model: string;
    year: number;
    plate: string;
  };
}

export const mockCredentialTypes: MockCredentialType[] = [
  {
    id: 'ct-1',
    name: 'Background Check',
    description: 'National criminal background check verification',
    category: 'driver',
    broker: { name: 'Uber Health' },
    stepCount: 4,
  },
  {
    id: 'ct-2',
    name: 'Drug & Alcohol Screening',
    description: '10-panel drug test with alcohol screening',
    category: 'driver',
    broker: { name: 'Uber Health' },
    stepCount: 3,
  },
  {
    id: 'ct-3',
    name: 'Vehicle Safety Inspection',
    description: '19-point vehicle safety inspection',
    category: 'vehicle',
    stepCount: 5,
  },
  {
    id: 'ct-4',
    name: 'HIPAA Compliance Training',
    description: 'Health information privacy training and certification',
    category: 'driver',
    broker: { name: 'MedTrans' },
    stepCount: 6,
  },
  {
    id: 'ct-5',
    name: 'Defensive Driving Course',
    description: 'Online defensive driving certification',
    category: 'driver',
    stepCount: 4,
  },
  {
    id: 'ct-6',
    name: 'Vehicle Registration',
    description: 'Current vehicle registration verification',
    category: 'vehicle',
    stepCount: 2,
  },
  {
    id: 'ct-7',
    name: 'Insurance Verification',
    description: 'Auto liability insurance verification',
    category: 'vehicle',
    stepCount: 2,
  },
];

export const mockReviewQueue: MockCredential[] = [
  {
    id: 'cred-1',
    credentialType: mockCredentialTypes[0], // Background Check
    status: 'pending_review',
    submittedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
    expiresAt: null,
    progress: 100,
    driver: { name: 'Marcus Johnson', initials: 'MJ', type: 'W2' },
  },
  {
    id: 'cred-2',
    credentialType: mockCredentialTypes[1], // Drug Test
    status: 'pending_review',
    submittedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
    expiresAt: null,
    progress: 100,
    driver: { name: 'Sarah Chen', initials: 'SC', type: '1099' },
  },
  {
    id: 'cred-3',
    credentialType: mockCredentialTypes[2], // Vehicle Inspection
    status: 'awaiting_verification',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    expiresAt: null,
    progress: 100,
    vehicle: { make: 'Toyota', model: 'Camry', year: 2022, plate: 'ABC-1234' },
  },
  {
    id: 'cred-4',
    credentialType: mockCredentialTypes[3], // HIPAA Training
    status: 'pending_review',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    expiresAt: null,
    progress: 100,
    driver: { name: 'David Williams', initials: 'DW', type: 'W2' },
  },
  {
    id: 'cred-5',
    credentialType: mockCredentialTypes[4], // Defensive Driving
    status: 'pending_review',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    expiresAt: null,
    progress: 100,
    driver: { name: 'Emily Rodriguez', initials: 'ER', type: '1099' },
  },
];

export const mockApprovedCredentials: MockCredential[] = [
  {
    id: 'cred-approved-1',
    credentialType: mockCredentialTypes[0],
    status: 'approved',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 360).toISOString(),
    progress: 100,
    driver: { name: 'James Thompson', initials: 'JT', type: 'W2' },
  },
  {
    id: 'cred-approved-2',
    credentialType: mockCredentialTypes[1],
    status: 'approved',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
    progress: 100,
    driver: { name: 'Lisa Park', initials: 'LP', type: '1099' },
  },
];

// For the demo credential detail view
export const mockCredentialDetail = {
  credential: mockReviewQueue[0],
  submittedData: {
    quizAnswers: {
      'q1': { answer: 'B', correct: true },
      'q2': { answer: 'A', correct: true },
      'q3': { answer: 'C', correct: true },
    },
    uploadedFiles: [
      { name: 'background_check_authorization.pdf', size: '245 KB', uploadedAt: new Date().toISOString() },
    ],
    signatureData: 'data:image/png;base64,signature...',
    formData: {
      ssn_last_4: '7890',
      consent_date: new Date().toLocaleDateString(),
    },
  },
};

// Time formatting helpers
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
