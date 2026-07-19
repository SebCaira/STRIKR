// Supabase (and its underlying fetch client) occasionally surfaces a non-
// message error — e.g. a stringified raw HTTP response — when the server
// returns an unexpected failure. Never show that verbatim to a user.
export function friendlyError(error: { message?: string } | null | undefined, fallback: string): string {
  const msg = error?.message;
  if (typeof msg === 'string' && msg.length > 0 && msg.length < 200 && !msg.trim().startsWith('{')) {
    return msg;
  }
  return fallback;
}
