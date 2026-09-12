const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

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

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const supabaseKey = (rawKey && rawKey.trim()) ? rawKey.trim() : 'placeholder-service-key';

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: {
      transport: WebSocket
    }
  });
} catch (err) {
  console.warn('Warning: Failed to initialize backend Supabase client:', err.message);
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-service-key', {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
  });
}

module.exports = supabase;
