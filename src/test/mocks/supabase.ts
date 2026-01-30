import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  maybeSingle: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  then: vi.fn(),
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
};

// Helper to reset all mocks
export function resetSupabaseMocks() {
  Object.values(mockSupabase).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  });
}

// Helper to set up a successful query response
export function mockQueryResponse<T>(data: T, error: null = null) {
  return Promise.resolve({ data, error });
}

// Helper to set up an error response
export function mockQueryError(message: string) {
  return Promise.resolve({ data: null, error: { message } });
}
