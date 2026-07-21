// Purely cosmetic borders around the avatar circle — a diamond sink with no
// gameplay effect, visible to others (League leaderboard) for a bit of
// social status. No image assets needed: just colors/gradients drawn at
// render time by <AvatarFrame>.
export type FrameKind = 'ring' | 'gradient';

export interface AvatarFrameDef {
  id: string;
  cost: number;
  kind: FrameKind;
  colors: [string, string] | [string]; // gradient stops, or a single ring color
  labelKey: string;
}

export const AVATAR_FRAMES: AvatarFrameDef[] = [
  { id: 'bronze', cost: 150, kind: 'ring', colors: ['#c17a3d'], labelKey: 'frame_bronze' },
  { id: 'silver', cost: 300, kind: 'ring', colors: ['#b9c2cc'], labelKey: 'frame_silver' },
  { id: 'gold', cost: 600, kind: 'ring', colors: ['#ffcc4d'], labelKey: 'frame_gold' },
  { id: 'rainbow', cost: 1000, kind: 'gradient', colors: ['#ff5a3c', '#2b3ff2'], labelKey: 'frame_rainbow' },
];

export function frameById(id: string | null | undefined): AvatarFrameDef | null {
  if (!id) return null;
  return AVATAR_FRAMES.find((f) => f.id === id) || null;
}
