// Purely cosmetic borders around the avatar circle — visible to others
// (League leaderboard) for a bit of social status. No image assets needed:
// just colors/gradients drawn at render time by <AvatarFrame>. Two ways to
// get one: buy it with diamonds (`cost`), or reach a level (`unlockLevel`,
// free — level itself didn't unlock anything before this, so this is what
// makes leveling up feel like it's for something beyond a number going up).
export type FrameKind = 'ring' | 'gradient';

export interface AvatarFrameDef {
  id: string;
  cost?: number;
  unlockLevel?: number;
  kind: FrameKind;
  colors: [string, string] | [string]; // gradient stops, or a single ring color
  labelKey: string;
}

export const AVATAR_FRAMES: AvatarFrameDef[] = [
  { id: 'bronze', cost: 150, kind: 'ring', colors: ['#c17a3d'], labelKey: 'frame_bronze' },
  { id: 'silver', cost: 300, kind: 'ring', colors: ['#b9c2cc'], labelKey: 'frame_silver' },
  { id: 'gold', cost: 600, kind: 'ring', colors: ['#ffcc4d'], labelKey: 'frame_gold' },
  { id: 'rainbow', cost: 1000, kind: 'gradient', colors: ['#ff5a3c', '#2b3ff2'], labelKey: 'frame_rainbow' },
  { id: 'mint', unlockLevel: 5, kind: 'ring', colors: ['#a8f5c6'], labelKey: 'frame_mint' },
  { id: 'ocean', unlockLevel: 10, kind: 'gradient', colors: ['#2b3ff2', '#a8f5c6'], labelKey: 'frame_ocean' },
  { id: 'sunset', unlockLevel: 15, kind: 'gradient', colors: ['#ff5a3c', '#ffcae0'], labelKey: 'frame_sunset' },
  { id: 'cosmic', unlockLevel: 20, kind: 'gradient', colors: ['#2b3ff2', '#ffcae0'], labelKey: 'frame_cosmic' },
];

export function frameById(id: string | null | undefined): AvatarFrameDef | null {
  if (!id) return null;
  return AVATAR_FRAMES.find((f) => f.id === id) || null;
}
