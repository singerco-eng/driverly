import { describe, it, expect } from 'vitest';
import { formatDate } from '@/lib/formatters';

describe('formatDate', () => {
  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns em-dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('formats a date string', () => {
    const result = formatDate('2024-01-15');
    expect(result).toMatch(/1\/15\/2024|15\/01\/2024|2024/);
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date('2024-06-01'));
    expect(result).toMatch(/6\/1\/2024|01\/06\/2024|2024/);
  });
});
