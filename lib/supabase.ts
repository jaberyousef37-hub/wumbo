import 'expo-sqlite/localStorage/install';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

// Read from app.config.js extra (most reliable) or process.env
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Debug: log URL on startup to verify env vars are read correctly
const source = Constants.expoConfig?.extra?.supabaseUrl ? 'expoConfig.extra' : 'process.env';
console.log('[Supabase] URL:', supabaseUrl || '(empty)');
console.log('[Supabase] Source:', source);
console.log('[Supabase] Key present:', !!supabaseAnonKey, supabaseAnonKey ? `(${supabaseAnonKey.slice(0, 8)}...${supabaseAnonKey.slice(-4)})` : '');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then restart with: npx expo start -c'
  );
}

// Ensure URL has https and no trailing slash
const normalizedUrl = supabaseUrl.replace(/\/$/, '');
if (!normalizedUrl.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL must start with https://');
}

export { normalizedUrl as supabaseUrl, supabaseAnonKey };
export const supabase = createClient(normalizedUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
