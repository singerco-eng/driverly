/**
 * Demo Admin Review Page
 * 
 * This renders the REAL admin components with mock data.
 * Two views: Queue (EnhancedDataView) and Detail (CredentialDetailView)
 */

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck2, Car } from 'lucide-react';

// Import REAL components
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { FilterBar } from '@/components/ui/filter-bar';
import { CredentialReviewCard } from '@/components/features/admin/CredentialReviewCard';
import { CredentialDetailHeader } from '@/components/features/credentials/CredentialDetail/CredentialDetailHeader';
import { InstructionRenderer } from '@/components/features/credentials/InstructionRenderer';
import { formatDate } from '@/lib/formatters';
import { credentialStatusConfig, type CredentialStatusConfigEntry } from '@/lib/status-configs';

// Import REAL types
import type { CredentialForReview, ReviewStatus } from '@/types/credentialReview';
import type { CredentialType, DriverCredential } from '@/types/credential';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';

// ============================================
// MOCK DOCUMENT IMAGES (Using Lorem Picsum with blur for privacy look)
// ============================================

const MOCK_DOCUMENTS = {
  // User-provided realistic document mockups (served from public/demo/)
  driverLicenseFront: '/demo/license-front.png',
  driverLicenseBack: '/demo/license-back.png',
  driverLicenseWhite: '/demo/white-license.jpg', // Alternative license for variety
  drugTestResults: '/demo/drug-test-results.jpg',
  insuranceCardFront: '/demo/car-insurance-card.png',
  insuranceCardBack: '/demo/car-insurance-card.png', // Using same image for front/back
  vehicleRegistration: '/demo/vehicle-registration.webp',
  genericDocument: '/demo/license-front.png', // Fallback to license
};

// ============================================
// MOCK DATA - Matches exact TypeScript types
// ============================================

const mockInstructionConfig: CredentialTypeInstructions = {
  version: 2,
  steps: [
    {
      id: 'step-1',
      title: 'Personal Information',
      type: 'form_input',
      required: true,
      order: 1,
      blocks: [
        {
          id: 'block-1',
          order: 1,
          type: 'form_field',
          content: { key: 'full_name', label: 'Full Legal Name', type: 'text', placeholder: 'Enter your full name', required: true },
        },
        {
          id: 'block-2',
          order: 2,
          type: 'form_field',
          content: { key: 'dob', label: 'Date of Birth', type: 'date', placeholder: 'MM/DD/YYYY', required: true },
        },
        {
          id: 'block-3',
          order: 3,
          type: 'form_field',
          content: { key: 'ssn_last4', label: 'SSN (Last 4 Digits)', type: 'text', placeholder: '****', required: true },
        },
      ],
      conditions: [],
      completion: { type: 'form_submit' },
    },
    {
      id: 'step-2',
      title: 'Upload Government ID',
      type: 'document_upload',
      required: true,
      order: 2,
      blocks: [
        {
          id: 'block-4',
          order: 1,
          type: 'file_upload',
          content: { label: 'Government ID (Front & Back)', accept: 'image/*,.pdf', maxSizeMB: 10, multiple: true, required: true },
        },
      ],
      conditions: [],
      completion: { type: 'manual' },
    },
    {
      id: 'step-3',
      title: 'Consent & Authorization',
      type: 'signature',
      required: true,
      order: 3,
      blocks: [
        {
          id: 'block-6',
          order: 1,
          type: 'rich_text',
          content: {
            html: '<p>By signing below, I authorize <strong>Acme Medical Transport</strong> to conduct a background check through our verified partner CheckrPro Inc. I understand this check will include:</p><ul><li>Criminal history</li><li>Driving record</li><li>Employment verification</li></ul>',
          },
        },
        {
          id: 'block-7',
          order: 2,
          type: 'signature_pad',
          content: { label: 'Your Signature', required: true, allowTyped: true, allowDrawn: true, agreementText: 'I agree to the terms above' },
        },
      ],
      conditions: [],
      completion: { type: 'manual' },
    },
  ],
  settings: {
    showProgressBar: true,
    allowStepSkip: false,
    completionBehavior: 'required_only',
    externalSubmissionAllowed: false,
  },
};

const baseCredentialType = {
  scope: 'global' as const,
  requirement: 'required' as const,
  employment_type: 'both' as const,
  requires_driver_action: true,
  vehicle_types: null,
  submission_type: null,
  form_schema: null,
  signature_document_url: null,
  expiration_type: 'fixed_interval' as const,
  expiration_interval_days: null,
  expiration_warning_days: 30,
  grace_period_days: 30,
  display_order: 1,
  is_active: true,
  is_seeded: false,
  status: 'active' as const,
  effective_date: new Date().toISOString(),
  published_at: new Date().toISOString(),
  published_by: null,
  created_by: null,
};

// GLOBAL credential types (no broker - applies to all drivers)
const globalBackgroundCheck: CredentialType = {
  ...baseCredentialType,
  id: 'ct-1',
  company_id: 'demo-company',
  broker_id: null, // Global - no broker
  name: 'Background Check',
  description: 'National criminal background check verification',
  category: 'driver',
  is_required: true,
  is_active: true,
  expiration_months: 12,
  expiration_interval_days: 365,
  instruction_config: mockInstructionConfig,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // No broker = global credential
};

const globalDrugScreening: CredentialType = {
  ...baseCredentialType,
  id: 'ct-2',
  company_id: 'demo-company',
  broker_id: null, // Global
  name: 'Drug & Alcohol Screening',
  description: '10-panel drug test with alcohol screening',
  category: 'driver',
  is_required: true,
  is_active: true,
  expiration_months: 6,
  expiration_interval_days: 180,
  instruction_config: {
    version: 2,
    steps: [
      {
        id: 's1',
        title: 'Test Information',
        type: 'form_input',
        required: true,
        order: 1,
        blocks: [
          { id: 'b1', order: 1, type: 'form_field', content: { key: 'test_date', label: 'Test Date', type: 'date', required: true } },
          { id: 'b2', order: 2, type: 'form_field', content: { key: 'facility_name', label: 'Testing Facility', type: 'text', placeholder: 'e.g. Quest Diagnostics', required: true } },
          { id: 'b3', order: 3, type: 'form_field', content: { key: 'facility_address', label: 'Facility Address', type: 'text', placeholder: 'Full address', required: true } },
        ],
        conditions: [],
        completion: { type: 'form_submit' },
      },
      {
        id: 's2',
        title: 'Upload Test Results',
        type: 'document_upload',
        required: true,
        order: 2,
        blocks: [
          { id: 'b4', order: 1, type: 'file_upload', content: { label: 'Drug Test Results', accept: 'image/*,.pdf', maxSizeMB: 10, multiple: false, required: true } },
        ],
        conditions: [],
        completion: { type: 'manual' },
      },
      {
        id: 's3',
        title: 'Policy Acknowledgement',
        type: 'signature',
        required: true,
        order: 3,
        blocks: [
          { id: 'b5', order: 1, type: 'rich_text', content: { html: '<p>I acknowledge that I have completed a 10-panel drug screening as required by <strong>Acme Medical Transport</strong>. I understand that a positive result may affect my eligibility for work.</p>' } },
          { id: 'b6', order: 2, type: 'signature_pad', content: { label: 'Signature', required: true, allowTyped: true, allowDrawn: true, agreementText: 'I certify the above information is accurate' } },
        ],
        conditions: [],
        completion: { type: 'manual' },
      },
    ],
    settings: { showProgressBar: true, allowStepSkip: false, completionBehavior: 'required_only', externalSubmissionAllowed: false },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const globalDriversLicense: CredentialType = {
  ...baseCredentialType,
  id: 'ct-3',
  company_id: 'demo-company',
  broker_id: null, // Global
  name: "Driver's License",
  description: 'Valid state-issued driver license',
  category: 'driver',
  is_required: true,
  is_active: true,
  expiration_months: null,
  expiration_type: 'never',
  expiration_interval_days: null,
  instruction_config: {
    version: 2,
    steps: [
      {
        id: 's1',
        title: 'License Details',
        type: 'form_input',
        required: true,
        order: 1,
        blocks: [
          { id: 'b1', order: 1, type: 'form_field', content: { key: 'license_number', label: 'License Number', type: 'text', placeholder: 'e.g. D1234567', required: true } },
          { id: 'b2', order: 2, type: 'form_field', content: { key: 'state', label: 'Issuing State', type: 'text', placeholder: 'e.g. California', required: true } },
          { id: 'b3', order: 3, type: 'form_field', content: { key: 'expiration_date', label: 'Expiration Date', type: 'date', required: true } },
          { id: 'b4', order: 4, type: 'form_field', content: { key: 'license_class', label: 'License Class', type: 'text', placeholder: 'e.g. C, CDL-A', required: false } },
        ],
        conditions: [],
        completion: { type: 'form_submit' },
      },
      {
        id: 's2',
        title: 'Upload License',
        type: 'document_upload',
        required: true,
        order: 2,
        blocks: [
          { id: 'b5', order: 1, type: 'file_upload', content: { label: 'License (Front & Back)', accept: 'image/*,.pdf', maxSizeMB: 10, multiple: true, required: true } },
        ],
        conditions: [],
        completion: { type: 'manual' },
      },
    ],
    settings: { showProgressBar: true, allowStepSkip: false, completionBehavior: 'required_only', externalSubmissionAllowed: false },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// VEHICLE credential types (global - applies to all vehicles)
const vehicleInsurance: CredentialType = {
  ...baseCredentialType,
  id: 'ct-v1',
  company_id: 'demo-company',
  broker_id: null, // Global
  name: 'Vehicle Insurance',
  description: 'Proof of auto liability insurance',
  category: 'vehicle',
  is_required: true,
  is_active: true,
  expiration_months: 6,
  expiration_interval_days: 180,
  instruction_config: {
    version: 2,
    steps: [
      {
        id: 's1',
        title: 'Policy Details',
        type: 'form_input',
        required: true,
        order: 1,
        blocks: [
          { id: 'b1', order: 1, type: 'form_field', content: { key: 'insurance_provider', label: 'Insurance Provider', type: 'text', placeholder: 'e.g. State Farm', required: true } },
          { id: 'b2', order: 2, type: 'form_field', content: { key: 'policy_number', label: 'Policy Number', type: 'text', placeholder: 'e.g. POL-123456', required: true } },
          { id: 'b3', order: 3, type: 'form_field', content: { key: 'coverage_amount', label: 'Coverage Amount', type: 'text', placeholder: 'e.g. $100,000', required: true } },
          { id: 'b4', order: 4, type: 'form_field', content: { key: 'policy_expiration', label: 'Policy Expiration Date', type: 'date', required: true } },
        ],
        conditions: [],
        completion: { type: 'form_submit' },
      },
      {
        id: 's2',
        title: 'Upload Insurance Card',
        type: 'document_upload',
        required: true,
        order: 2,
        blocks: [
          { id: 'b5', order: 1, type: 'file_upload', content: { label: 'Insurance Card (Front & Back)', accept: 'image/*,.pdf', maxSizeMB: 10, multiple: true, required: true } },
        ],
        conditions: [],
        completion: { type: 'manual' },
      },
    ],
    settings: { showProgressBar: true, allowStepSkip: false, completionBehavior: 'required_only', externalSubmissionAllowed: false },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const vehicleRegistration: CredentialType = {
  ...baseCredentialType,
  id: 'ct-v2',
  company_id: 'demo-company',
  broker_id: null,
  name: 'Vehicle Registration',
  description: 'Current vehicle registration',
  category: 'vehicle',
  is_required: true,
  is_active: true,
  expiration_months: 12,
  expiration_interval_days: 365,
  instruction_config: {
    version: 2,
    steps: [
      {
        id: 's1',
        title: 'Upload Registration',
        type: 'document_upload',
        required: true,
        order: 1,
        blocks: [
          { id: 'b1', order: 1, type: 'rich_text', content: { html: '<p>Please upload a clear photo or scan of your current vehicle registration document.</p>' } },
          { id: 'b2', order: 2, type: 'file_upload', content: { label: 'Vehicle Registration Document', accept: 'image/*,.pdf', maxSizeMB: 10, multiple: false, required: true } },
        ],
        conditions: [],
        completion: { type: 'manual' },
      },
    ],
    settings: { showProgressBar: true, allowStepSkip: false, completionBehavior: 'required_only', externalSubmissionAllowed: false },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const vehicleInspection: CredentialType = {
  ...baseCredentialType,
  id: 'ct-v3',
  company_id: 'demo-company',
  broker_id: null,
  name: 'Safety Inspection',
  description: '19-point vehicle safety inspection',
  category: 'vehicle',
  is_required: true,
  is_active: true,
  expiration_months: 12,
  expiration_interval_days: 365,
  instruction_config: {
    version: 2,
    steps: [
      { id: 's1', title: 'Inspection Checklist', type: 'form_input', required: true, order: 1, blocks: [], conditions: [], completion: { type: 'form_submit' } },
      { id: 's2', title: 'Upload Photos', type: 'document_upload', required: true, order: 2, blocks: [], conditions: [], completion: { type: 'manual' } },
    ],
    settings: { showProgressBar: true, allowStepSkip: false, completionBehavior: 'required_only', externalSubmissionAllowed: false },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// DRIVER CREDENTIALS
const mockDriverCredentials: CredentialForReview[] = [
  {
    id: 'cred-1',
    credentialTable: 'driver_credentials',
    credentialType: globalBackgroundCheck,
    status: 'pending_review',
    displayStatus: 'pending_review',
    documentUrl: null,
    documentUrls: ['https://example.com/id-front.jpg', 'https://example.com/id-back.jpg'],
    signatureData: 'data:image/png;base64,signature...',
    formData: { full_name: 'Marcus Johnson', dob: '03/15/1988', ssn_last4: '7890' },
    enteredDate: null,
    notes: null,
    submittedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    expiresAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: null,
    rejectionReason: null,
    daysUntilExpiration: null,
    isExpiringSoon: false,
    driver: {
      id: 'driver-1',
      company_id: 'demo-company',
      user_id: 'user-1',
      employment_type: 'w2',
      status: 'pending',
      application_status: 'approved',
      created_at: '',
      updated_at: '',
      user: { id: 'user-1', full_name: 'Marcus Johnson', email: 'marcus.johnson@email.com', role: 'driver' },
    },
  },
  {
    id: 'cred-2',
    credentialTable: 'driver_credentials',
    credentialType: globalDrugScreening,
    status: 'pending_review',
    displayStatus: 'pending_review',
    documentUrl: null,
    documentUrls: ['https://example.com/drugtest.pdf'],
    signatureData: null,
    formData: { test_date: '2026-01-20', facility: 'Quest Diagnostics', result: 'Negative' },
    enteredDate: null,
    notes: null,
    submittedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    expiresAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: null,
    rejectionReason: null,
    daysUntilExpiration: null,
    isExpiringSoon: false,
    driver: {
      id: 'driver-2',
      company_id: 'demo-company',
      user_id: 'user-2',
      employment_type: '1099',
      status: 'pending',
      application_status: 'approved',
      created_at: '',
      updated_at: '',
      user: { id: 'user-2', full_name: 'Sarah Chen', email: 'sarah.chen@email.com', role: 'driver' },
    },
  },
  {
    id: 'cred-3',
    credentialTable: 'driver_credentials',
    credentialType: globalDriversLicense,
    status: 'pending_review',
    displayStatus: 'pending_review',
    documentUrl: null,
    documentUrls: ['https://example.com/license.jpg'],
    signatureData: null,
    formData: { license_number: 'D1234567', state: 'CA', expiration: '2028-03-15' },
    enteredDate: null,
    notes: null,
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    expiresAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: null,
    rejectionReason: null,
    daysUntilExpiration: null,
    isExpiringSoon: false,
    driver: {
      id: 'driver-3',
      company_id: 'demo-company',
      user_id: 'user-3',
      employment_type: 'w2',
      status: 'pending',
      application_status: 'approved',
      created_at: '',
      updated_at: '',
      user: { id: 'user-3', full_name: 'David Williams', email: 'david.williams@email.com', role: 'driver' },
    },
  },
];

// VEHICLE CREDENTIALS
const mockVehicleCredentials: CredentialForReview[] = [
  {
    id: 'vcred-1',
    credentialTable: 'vehicle_credentials',
    credentialType: vehicleInsurance,
    status: 'pending_review',
    displayStatus: 'pending_review',
    documentUrl: null,
    documentUrls: ['https://example.com/insurance-card.jpg'],
    signatureData: null,
    formData: { policy_number: 'POL-123456', provider: 'State Farm', coverage_amount: '$100,000' },
    enteredDate: null,
    notes: null,
    submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(), // 6 months
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: null,
    rejectionReason: null,
    daysUntilExpiration: 180,
    isExpiringSoon: false,
    vehicle: {
      id: 'vehicle-1',
      driver_id: 'driver-1',
      company_id: 'demo-company',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      color: 'Silver',
      license_plate: 'ABC-1234',
      vin: '1HGBH41JXMN109186',
      is_primary: true,
      status: 'pending',
      created_at: '',
      updated_at: '',
    },
  },
  {
    id: 'vcred-2',
    credentialTable: 'vehicle_credentials',
    credentialType: vehicleRegistration,
    status: 'pending_review',
    displayStatus: 'pending_review',
    documentUrl: null,
    documentUrls: ['https://example.com/registration.pdf'],
    signatureData: null,
    formData: {},
    enteredDate: null,
    notes: null,
    submittedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: null,
    rejectionReason: null,
    daysUntilExpiration: 365,
    isExpiringSoon: false,
    vehicle: {
      id: 'vehicle-2',
      driver_id: 'driver-2',
      company_id: 'demo-company',
      make: 'Honda',
      model: 'Accord',
      year: 2021,
      color: 'Black',
      license_plate: 'XYZ-5678',
      vin: '2HGFC2F59MH123456',
      is_primary: true,
      status: 'pending',
      created_at: '',
      updated_at: '',
    },
  },
  {
    id: 'vcred-3',
    credentialTable: 'vehicle_credentials',
    credentialType: vehicleInspection,
    status: 'awaiting_verification',
    displayStatus: 'awaiting_verification',
    documentUrl: null,
    documentUrls: ['https://example.com/inspection1.jpg', 'https://example.com/inspection2.jpg'],
    signatureData: null,
    formData: { inspection_date: '2026-01-15', inspector_name: 'John Smith', passed: true },
    enteredDate: null,
    notes: null,
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    expiresAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: null,
    rejectionReason: null,
    daysUntilExpiration: null,
    isExpiringSoon: false,
    vehicle: {
      id: 'vehicle-3',
      driver_id: 'driver-3',
      company_id: 'demo-company',
      make: 'Ford',
      model: 'Escape',
      year: 2023,
      color: 'White',
      license_plate: 'DEF-9012',
      vin: '3FMCU9J91NUA12345',
      is_primary: true,
      status: 'pending',
      created_at: '',
      updated_at: '',
    },
  },
];

// REVIEW HISTORY
import type { ReviewHistoryItem } from '@/types/credentialReview';

// Extended history item with display fields for demo
interface DemoHistoryItem extends ReviewHistoryItem {
  driverName?: string;
  vehicleInfo?: string;
  credentialTypeName: string;
}

const mockReviewHistory: DemoHistoryItem[] = [
  {
    id: 'history-1',
    credentialId: 'cred-old-1',
    credentialTable: 'driver_credentials',
    status: 'approved',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 30).toISOString(),
    reviewedBy: 'admin-1',
    reviewNotes: 'All documents verified. Background check clear.',
    rejectionReason: null,
    submissionData: {},
    reviewer: { full_name: 'Admin User' },
    driverName: 'Marcus Johnson',
    credentialTypeName: 'Background Check',
  },
  {
    id: 'history-2',
    credentialId: 'cred-old-2',
    credentialTable: 'driver_credentials',
    status: 'rejected',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 45).toISOString(),
    reviewedBy: 'admin-1',
    reviewNotes: null,
    rejectionReason: 'License photo is blurry. Please upload a clearer image.',
    submissionData: {},
    reviewer: { full_name: 'Admin User' },
    driverName: 'Sarah Chen',
    credentialTypeName: "Driver's License",
  },
  {
    id: 'history-3',
    credentialId: 'vcred-old-1',
    credentialTable: 'vehicle_credentials',
    status: 'approved',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 20).toISOString(),
    reviewedBy: 'admin-1',
    reviewNotes: 'Insurance verified with provider.',
    rejectionReason: null,
    submissionData: {},
    reviewer: { full_name: 'Admin User' },
    vehicleInfo: '2023 Toyota Camry',
    credentialTypeName: 'Vehicle Insurance',
  },
  {
    id: 'history-4',
    credentialId: 'cred-old-3',
    credentialTable: 'driver_credentials',
    status: 'approved',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 15).toISOString(),
    reviewedBy: 'admin-1',
    reviewNotes: 'Drug test results confirmed negative.',
    rejectionReason: null,
    submissionData: {},
    driverName: 'David Williams',
    credentialTypeName: 'Drug & Alcohol Screening',
    reviewer: { full_name: 'Admin User' },
  },
  {
    id: 'history-5',
    credentialId: 'vcred-old-2',
    credentialTable: 'vehicle_credentials',
    status: 'rejected',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10 + 1000 * 60 * 60).toISOString(),
    reviewedBy: 'admin-1',
    reviewNotes: null,
    rejectionReason: 'Vehicle inspection shows failed brake light. Please repair and resubmit.',
    submissionData: {},
    reviewer: { full_name: 'Admin User' },
    vehicleInfo: '2022 Honda Accord',
    credentialTypeName: 'Vehicle Registration',
  },
];

// Status config for table view
type DisplayStatus = ReviewStatus | 'not_submitted';
const awaitingVerificationConfig: CredentialStatusConfigEntry = {
  label: 'Awaiting Verification',
  variant: 'secondary',
};
const getStatusConfig = (status: DisplayStatus) =>
  status === 'awaiting_verification'
    ? awaitingVerificationConfig
    : credentialStatusConfig[status] || credentialStatusConfig.not_submitted;

function getSubjectLabel(credential: CredentialForReview) {
  if (credential.driver?.user?.full_name) {
    return `${credential.driver.user.full_name} (${credential.driver.employment_type.toUpperCase()})`;
  }
  return '—';
}

// Create a mock DriverCredential from CredentialForReview for the detail view
function toDriverCredential(review: CredentialForReview): DriverCredential {
  return {
    id: review.id,
    driver_id: review.driver?.id || '',
    credential_type_id: review.credentialType.id,
    company_id: 'demo-company',
    status: review.status,
    document_url: review.documentUrl,
    form_data: review.formData,
    notes: review.notes,
    submitted_at: review.submittedAt,
    expires_at: review.expiresAt,
    reviewed_at: review.reviewedAt,
    reviewed_by: review.reviewedBy,
    review_notes: review.reviewNotes,
    rejection_reason: review.rejectionReason,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Import the correct type
import type { StepProgressData } from '@/types/credentialProgress';

// Generate mock progress data for a specific credential
// This creates realistic filled-in data based on the driver's name
function generateMockProgressData(credential: CredentialForReview): StepProgressData {
  const driverName = credential.driver?.user?.full_name || 'John Doe';
  const steps = credential.credentialType.instruction_config?.steps || [];
  
  const stepsData: Record<string, {
    completed: boolean;
    completedAt: string | null;
    formData: Record<string, unknown>;
    uploadedFiles: string[];
    signatureData: { type: 'typed' | 'drawn'; value: string; timestamp: string } | null;
    checklistStates: Record<string, boolean>;
    externalLinksVisited: string[];
    quizAnswers: Record<string, string>;
    videosWatched: Record<string, boolean>;
  }> = {};
  
  steps.forEach((step, index) => {
    const timeOffset = (steps.length - index) * 10; // Minutes ago
    stepsData[step.id] = {
      completed: true,
      completedAt: new Date(Date.now() - 1000 * 60 * timeOffset).toISOString(),
      formData: {},
      uploadedFiles: [],
      signatureData: null,
      checklistStates: {},
      externalLinksVisited: [],
      quizAnswers: {},
      videosWatched: {},
    };
    
    // Fill in data based on block types in this step
    step.blocks?.forEach((block) => {
      switch (block.type) {
        case 'form_field': {
          const content = block.content as { key: string; label: string; type: string };
          const keyLower = content.key?.toLowerCase() || '';
          const labelLower = content.label?.toLowerCase() || '';
          
          // Generate realistic values based on field type/label
          let value: unknown = '';
          
          // Date fields
          if (content.type === 'date' || keyLower.includes('date') || keyLower.includes('dob')) {
            if (keyLower.includes('expir')) {
              value = '2027-06-15'; // Future date for expirations
            } else if (keyLower.includes('dob') || keyLower.includes('birth')) {
              value = '1988-03-15';
            } else {
              value = '2026-01-15'; // Recent date for tests, submissions
            }
          }
          // Personal name (must be the person's name field, not facility/company)
          else if ((keyLower === 'full_name' || keyLower === 'name' || keyLower === 'legal_name') && 
                   !labelLower.includes('facility') && !labelLower.includes('company') && !labelLower.includes('provider')) {
            value = driverName;
          }
          // SSN - always show masked even in review
          else if (keyLower.includes('ssn')) {
            value = '••••7890';
          }
          // Email
          else if (keyLower.includes('email') || content.type === 'email') {
            value = `${driverName.toLowerCase().replace(' ', '.')}@email.com`;
          }
          // Phone
          else if (keyLower.includes('phone') || content.type === 'phone') {
            value = '(555) 123-4567';
          }
          // License number
          else if (keyLower.includes('license_number') || keyLower.includes('license_no')) {
            value = 'D' + Math.floor(1000000 + Math.random() * 9000000);
          }
          // Policy/document numbers
          else if (keyLower.includes('policy') || keyLower.includes('number')) {
            value = 'POL-' + Math.floor(100000 + Math.random() * 900000);
          }
          // State
          else if (keyLower === 'state' || labelLower.includes('state')) {
            value = 'California';
          }
          // Address
          else if (keyLower.includes('address')) {
            value = '123 Main Street, Anytown, CA 90210';
          }
          // Facility/Provider names
          else if (keyLower.includes('facility') || labelLower.includes('facility')) {
            value = 'Quest Diagnostics';
          }
          else if (keyLower.includes('provider') || labelLower.includes('provider') || labelLower.includes('insurance')) {
            value = 'State Farm Insurance';
          }
          // Coverage/amounts
          else if (keyLower.includes('coverage') || keyLower.includes('amount')) {
            value = '$100,000 / $300,000';
          }
          // License class
          else if (keyLower.includes('class')) {
            value = 'Class C';
          }
          // Default
          else {
            value = 'Completed';
          }
          stepsData[step.id].formData[content.key] = value;
          break;
        }
        case 'file_upload': {
          const content = block.content as { label: string; multiple?: boolean };
          // Use realistic mock documents
          const labelLower = content.label?.toLowerCase() || '';
          
          // Use white license for David Williams (Driver's License credential ct-3)
          const isDavidWilliams = driverName === 'David Williams';
          const isLicenseCredential = credential.credentialType.id === 'ct-3';
          
          // Handle combined front & back uploads
          if (labelLower.includes('front & back') || labelLower.includes('front and back')) {
            if (labelLower.includes('government id') || labelLower.includes('license')) {
              // License/ID - add front and back
              const frontImage = (isDavidWilliams || isLicenseCredential) ? MOCK_DOCUMENTS.driverLicenseWhite : MOCK_DOCUMENTS.driverLicenseFront;
              stepsData[step.id].uploadedFiles.push(frontImage);
              stepsData[step.id].uploadedFiles.push(MOCK_DOCUMENTS.driverLicenseBack);
            } else if (labelLower.includes('insurance')) {
              // Insurance card - add front and back
              stepsData[step.id].uploadedFiles.push(MOCK_DOCUMENTS.insuranceCardFront);
              stepsData[step.id].uploadedFiles.push(MOCK_DOCUMENTS.insuranceCardBack);
            }
          } else if (labelLower.includes('drug') || labelLower.includes('test') || labelLower.includes('result')) {
            stepsData[step.id].uploadedFiles.push(MOCK_DOCUMENTS.drugTestResults);
          } else if (labelLower.includes('registration')) {
            stepsData[step.id].uploadedFiles.push(MOCK_DOCUMENTS.vehicleRegistration);
          } else {
            stepsData[step.id].uploadedFiles.push(MOCK_DOCUMENTS.genericDocument);
          }
          break;
        }
        case 'signature_pad': {
          stepsData[step.id].signatureData = {
            type: 'typed',
            value: driverName,
            timestamp: new Date(Date.now() - 1000 * 60 * timeOffset).toISOString(),
          };
          break;
        }
        case 'checklist': {
          const content = block.content as { items: { id: string }[] };
          content.items?.forEach((item) => {
            stepsData[step.id].checklistStates[item.id] = true;
          });
          break;
        }
        case 'external_link': {
          stepsData[step.id].externalLinksVisited.push(block.id);
          break;
        }
        case 'video': {
          stepsData[step.id].videosWatched[block.id] = true;
          break;
        }
        case 'quiz_question': {
          const content = block.content as { options: { value: string }[] };
          if (content.options?.length > 0) {
            stepsData[step.id].quizAnswers[block.id] = content.options[0].value;
          }
          break;
        }
      }
    });
  });
  
  return { steps: stepsData };
}

interface DemoAdminReviewProps {
  embedded?: boolean; // When true, skip iframe check (rendered inline on homepage)
}

export default function DemoAdminReview({ embedded = false }: DemoAdminReviewProps) {
  const [selectedCredential, setSelectedCredential] = useState<CredentialForReview | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('drivers');

  // Redirect to website if accessed directly (not embedded or in iframe)
  useEffect(() => {
    if (embedded) return; // Skip check if rendered inline
    const isInIframe = window.self !== window.top;
    if (!isInIframe) {
      window.location.href = '/website';
    }
  }, [embedded]);

  // Handle browser back button when viewing detail (only when embedded)
  useEffect(() => {
    if (!embedded) return;
    
    const handlePopState = () => {
      // If we're viewing a credential detail and back is pressed, close it
      if (selectedCredential) {
        setSelectedCredential(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [embedded, selectedCredential]);

  // Filter driver credentials based on search
  const filteredDriverCredentials = useMemo(() => {
    if (!search) return mockDriverCredentials;
    const query = search.toLowerCase();
    return mockDriverCredentials.filter((c) => {
      const haystack = [
        c.credentialType.name,
        c.driver?.user?.full_name,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [search]);

  // Filter vehicle credentials based on search
  const filteredVehicleCredentials = useMemo(() => {
    if (!search) return mockVehicleCredentials;
    const query = search.toLowerCase();
    return mockVehicleCredentials.filter((c) => {
      const haystack = [
        c.credentialType.name,
        c.vehicle?.make,
        c.vehicle?.model,
        c.vehicle?.license_plate,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [search]);

  const handleView = (credential: CredentialForReview) => {
    setSelectedCredential(credential);
    // Push a history state so back button closes detail instead of navigating away
    if (embedded) {
      window.history.pushState({ demoDetail: true }, '');
    }
  };

  const handleBack = () => {
    setSelectedCredential(null);
    // Go back in history to remove the state we pushed
    if (embedded && window.history.state?.demoDetail) {
      window.history.back();
    }
  };

  // DETAIL VIEW - When a credential is selected
  if (selectedCredential) {
    const mockCredential = toDriverCredential(selectedCredential);
    const isVehicleCredential = selectedCredential.credentialTable === 'vehicle_credentials';
    
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Header with back button and approve/reject actions */}
          <CredentialDetailHeader
            credentialType={selectedCredential.credentialType}
            credentialTable={selectedCredential.credentialTable}
            status={mockCredential.status}
            expiresAt={mockCredential.expires_at}
            submittedAt={mockCredential.submitted_at}
            onBack={handleBack}
            backLabel="Back to Queue"
            actions={
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors">
                  Reject
                </button>
                <button className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4" />
                  Approve
                </button>
              </div>
            }
          />

          {/* Subject info card - Driver or Vehicle */}
          <Card className="p-4">
            {isVehicleCredential && selectedCredential.vehicle ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Car className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{selectedCredential.vehicle.year} {selectedCredential.vehicle.make} {selectedCredential.vehicle.model}</p>
                  <p className="text-sm text-muted-foreground">{selectedCredential.vehicle.license_plate} · {selectedCredential.vehicle.color}</p>
                </div>
              </div>
            ) : selectedCredential.driver ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
                  {selectedCredential.driver?.user?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-medium">{selectedCredential.driver?.user?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCredential.driver?.user?.email}</p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {selectedCredential.driver?.employment_type?.toUpperCase()}
                </Badge>
              </div>
            ) : null}
          </Card>

          {/* THE ACTUAL InstructionRenderer component with generated mock data */}
          <InstructionRenderer
            config={selectedCredential.credentialType.instruction_config || mockInstructionConfig}
            progressData={generateMockProgressData(selectedCredential)}
            onProgressChange={() => {}}
            onSubmit={() => {}}
            disabled={true}
            readOnly={true}
            credentialName={selectedCredential.credentialType.name}
          />
        </div>
      </div>
    );
  }

  // QUEUE VIEW - EnhancedDataView with cards/table
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold">Credential Review</h1>
          <p className="text-muted-foreground">Review and approve driver and vehicle credentials.</p>
        </div>

        {/* Tabs for driver/vehicle */}
        <Tabs defaultValue="drivers">
          <TabsList>
            <TabsTrigger value="drivers">Driver Credentials</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicle Credentials</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="mt-6">
            {/* EnhancedDataView - THE REAL COMPONENT */}
            <EnhancedDataView
              title="Driver Credentials"
              description={`Review ${filteredDriverCredentials.length} credentials`}
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search drivers or credentials..."
              filters={[
                {
                  value: 'needs_action',
                  onValueChange: () => {},
                  label: 'Status',
                  placeholder: 'All Status',
                  options: [
                    { value: 'needs_action', label: 'Needs Action' },
                    { value: 'pending_review', label: 'Pending Review' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'all', label: 'All Statuses' },
                  ],
                },
              ]}
              tableProps={{
                data: filteredDriverCredentials,
                loading: false,
                children: (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Credential</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDriverCredentials.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <FileCheck2 className="w-8 h-8 text-muted-foreground" />
                              <p className="text-muted-foreground">No credentials found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDriverCredentials.map((credential) => {
                          const status = getStatusConfig(credential.displayStatus as DisplayStatus);
                          return (
                            <TableRow
                              key={credential.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleView(credential)}
                            >
                              <TableCell className="font-medium">
                                {credential.credentialType.name}
                              </TableCell>
                              <TableCell>
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </TableCell>
                              <TableCell>{getSubjectLabel(credential)}</TableCell>
                              <TableCell>{formatDate(credential.submittedAt)}</TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground hover:text-foreground">
                                  View →
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                ),
              }}
              cardProps={{
                data: filteredDriverCredentials,
                loading: false,
                emptyState: (
                  <Card className="p-12 text-center">
                    <FileCheck2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No credentials found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                  </Card>
                ),
                renderCard: (credential) => (
                  <CredentialReviewCard
                    key={credential.id}
                    credential={credential}
                    onView={handleView}
                  />
                ),
              }}
            />
          </TabsContent>

          <TabsContent value="vehicles" className="mt-6">
            {/* Vehicle Credentials - Using real EnhancedDataView */}
            <EnhancedDataView
              title="Vehicle Credentials"
              description={`Review ${filteredVehicleCredentials.length} credentials`}
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search vehicles or credentials..."
              filters={[
                {
                  value: 'needs_action',
                  onValueChange: () => {},
                  label: 'Status',
                  placeholder: 'All Status',
                  options: [
                    { value: 'needs_action', label: 'Needs Action' },
                    { value: 'pending_review', label: 'Pending Review' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'all', label: 'All Statuses' },
                  ],
                },
              ]}
              tableProps={{
                data: filteredVehicleCredentials,
                loading: false,
                children: (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Credential</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVehicleCredentials.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Car className="w-8 h-8 text-muted-foreground" />
                              <p className="text-muted-foreground">No vehicle credentials found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVehicleCredentials.map((credential) => {
                          const status = getStatusConfig(credential.displayStatus as DisplayStatus);
                          return (
                            <TableRow
                              key={credential.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleView(credential)}
                            >
                              <TableCell className="font-medium">
                                {credential.credentialType.name}
                              </TableCell>
                              <TableCell>
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </TableCell>
                              <TableCell>{getSubjectLabel(credential)}</TableCell>
                              <TableCell>{formatDate(credential.submittedAt)}</TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground hover:text-foreground">
                                  View →
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                ),
              }}
              cardProps={{
                data: filteredVehicleCredentials,
                loading: false,
                emptyState: (
                  <Card className="p-12 text-center">
                    <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No vehicle credentials found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                  </Card>
                ),
                renderCard: (credential) => (
                  <CredentialReviewCard
                    key={credential.id}
                    credential={credential}
                    onView={handleView}
                  />
                ),
              }}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {/* History - Using real Card components like ReviewHistoryTab */}
            <div className="space-y-4">
              <FilterBar
                searchValue=""
                onSearchChange={() => {}}
                searchPlaceholder="Search by reviewer, credential id, or notes..."
                filters={[
                  {
                    value: 'all',
                    onValueChange: () => {},
                    label: 'Status',
                    placeholder: 'All Status',
                    options: [
                      { value: 'all', label: 'All Status' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                    ],
                  },
                  {
                    value: 'all',
                    onValueChange: () => {},
                    label: 'Type',
                    placeholder: 'All Types',
                    options: [
                      { value: 'all', label: 'All Types' },
                      { value: 'driver_credentials', label: 'Driver' },
                      { value: 'vehicle_credentials', label: 'Vehicle' },
                    ],
                  },
                ]}
                showClearAll
                onClearAll={() => {}}
              />

              <div className="space-y-3">
                {mockReviewHistory.map((item) => (
                  <Card key={item.id} className="p-4 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium capitalize">
                        {item.status.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : '—'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.credentialTypeName} · {item.driverName || item.vehicleInfo}
                    </div>
                    {item.reviewer?.full_name && (
                      <div className="text-xs text-muted-foreground">Reviewer: {item.reviewer.full_name}</div>
                    )}
                    {(item.reviewNotes || item.rejectionReason) && (
                      <div className="text-sm">
                        {item.reviewNotes || item.rejectionReason}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
