const AVATAR_COLORS = ['#ffe66b', '#a8f5c6', '#7a2b52', '#2b3ff2', '#2a6f4d', '#ffcae0', '#c9d8ff'];

export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
