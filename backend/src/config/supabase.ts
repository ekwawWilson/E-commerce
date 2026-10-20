import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase credentials not configured. Storage uploads will fall back to local storage.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseServiceKey && supabaseUrl !== 'https://your-project.supabase.co');
};

export default supabase;
