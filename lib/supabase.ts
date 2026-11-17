import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * R8: only the anon key ever reaches this bundle. All privileged logic is a
 * SECURITY DEFINER function on the server.
 */
export const hasSupabaseConfig = url.length > 0 && anonKey.length > 0;

/** Dev-only escape hatch: run the whole UI with no backend at all. */
export const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK === '1' && __DEV__;

const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  realtime: {
    params: { eventsPerSecond: 20 },
  },
});
