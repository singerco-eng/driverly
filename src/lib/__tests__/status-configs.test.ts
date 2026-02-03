import { describe, it, expect } from 'vitest';
import { credentialStatusConfig } from '@/lib/status-configs';

const expectedStatuses = [
  'approved',
  'rejected',
  'pending_review',
  'not_submitted',
  'expired',
  'expiring',
  'awaiting',
  'grace_period',
  'missing',
] as const;

describe('credentialStatusConfig', () => {
  it('defines labels and variants for each credential status', () => {
    expectedStatuses.forEach((status) => {
      const entry = credentialStatusConfig[status];
      expect(entry).toBeDefined();
      expect(entry.label).toEqual(expect.any(String));
      expect(entry.variant).toEqual(expect.any(String));
    });
  });
});
