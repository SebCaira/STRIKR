// Global JS-exception observer — see src/lib/ads.ts's history and Sarah's
// (Expo support) diagnosis of the ad-related fatal crash for why this
// exists: an error thrown inside a native-invoked callback never reaches a
// try/catch in our own call stack, and without a Mac/Console.app on hand to
// read the device's crash log, a fatal crash on a released build is
// otherwise a black box. This hooks React Native's own top-level handler —
// the same one that decides whether a JS error is fatal — to log whatever
// it sees to Supabase before handing off to the previous handler, so a real
// crash still crashes exactly as before, just with a record of what threw.
import { supabase } from './supabase';

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;
interface GlobalWithErrorUtils {
  ErrorUtils?: {
    getGlobalHandler(): ErrorHandler;
    setGlobalHandler(handler: ErrorHandler): void;
  };
}

let installed = false;

export function installGlobalErrorHandler() {
  if (installed) return;
  installed = true;
  const g = global as unknown as GlobalWithErrorUtils;
  if (!g.ErrorUtils) return;
  const previous = g.ErrorUtils.getGlobalHandler();
  g.ErrorUtils.setGlobalHandler((error, isFatal) => {
    try {
      const err = error as { message?: string; stack?: string } | undefined;
      supabase.auth
        .getSession()
        .then(({ data }) => {
          const userId = data.session?.user?.id;
          if (!userId) return;
          return supabase.from('app_events').insert({
            user_id: userId,
            event_name: 'js_global_error',
            properties: { message: err?.message ?? String(error), stack: err?.stack?.slice(0, 1000), isFatal: !!isFatal },
          });
        })
        .then(() => {});
    } catch {
      // Reporting is best-effort only — must never break error handling.
    }
    // Keep calling the previous handler, or every fatal error in the app —
    // not just the one we're investigating — silently vanishes instead of
    // crashing/logging the way React Native expects.
    previous(error, isFatal);
  });
}
