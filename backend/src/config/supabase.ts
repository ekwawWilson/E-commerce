import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('<your-project-ref>'));
};

if (!isSupabaseConfigured()) {
  console.warn('Supabase credentials not configured. Storage uploads will fall back to local storage.');
}

// Null when Supabase isn't configured: createClient throws without a URL, which
// used to stop the whole API from starting. Callers check isSupabaseConfigured().
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';

export default supabase;
