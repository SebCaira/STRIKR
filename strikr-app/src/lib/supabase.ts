import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rybdfbgjpnwkkeqeaddx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_R7pkg0p7eQPp6vC5FDDeXg_wk7GLOpD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface ProfileRow {
  id: string;
  display_name: string | null;
  diamonds: number;
  stats: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
