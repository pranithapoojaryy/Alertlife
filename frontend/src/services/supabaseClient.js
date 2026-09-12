import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(raw) {
  let url = (raw || '').trim();
  if (!url) return 'https://placeholder.supabase.co';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (!url.includes('.')) {
      return `https://${url}.supabase.co`;
    }
    return `https://${url}`;
  }
  return url;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const supabaseAnonKey = (rawKey && rawKey.trim()) ? rawKey.trim() : 'placeholder-anon-key';

let client;
try {
  client = createClient(supabaseUrl, supabaseAnonKey);
} catch (err) {
  console.warn('Warning: Failed to initialize Supabase client:', err.message);
  client = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
}

export const supabase = client;
