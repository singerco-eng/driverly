import { supabase } from '@/integrations/supabase/client';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function extractPath(input: string): string {
  if (input.startsWith('http')) {
    const parts = input.split('/vehicle-photos/');
    if (parts.length > 1) {
      return parts[1];
    }
  }
  return input;
}

export async function resolveVehiclePhotoUrl(raw: string | null): Promise<string | null> {
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;

  const path = extractPath(raw);
  const { data, error } = await supabase.storage
    .from('vehicle-photos')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (!error && data?.signedUrl) {
    return data.signedUrl;
  }

  return raw;
}
