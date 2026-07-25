// STRIKR accounts log in with a pseudo, not an email — Supabase Auth still
// needs an email under the hood, so we map the pseudo to a synthetic one
// here. A real recovery email can be added later from Settings.
const USERNAME_EMAIL_DOMAIN = 'users.strikr.app';

export function usernameToSlug(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

export function usernameToEmail(username: string): string {
  return `${usernameToSlug(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${USERNAME_EMAIL_DOMAIN}`);
}
