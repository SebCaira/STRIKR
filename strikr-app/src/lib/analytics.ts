// Minimal usage analytics — logs a handful of key events to Supabase so
// there's *some* visibility into how many people use the app and what they
// do, ahead of a real launch. Deliberately not a full analytics SDK (no
// native module, so it keeps working in Expo Go): just fire-and-forget
// inserts, queryable later straight from the Supabase dashboard/SQL editor.
import { supabase } from './supabase';

export function logEvent(userId: string | undefined, name: string, properties: Record<string, unknown> = {}): void {
  if (!userId) return;
  supabase.from('app_events').insert({ user_id: userId, event_name: name, properties }).then(() => {});
}
