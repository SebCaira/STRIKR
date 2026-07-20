import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { frameById } from '../data/avatarFrames';

// Wraps an avatar circle with a purchased cosmetic border. `size` is the
// avatar's own diameter — the frame adds a fixed ring around it, so the
// rendered footprint is a bit larger than `size`. Renders children as-is
// (no wrapper) when no frame is equipped, so existing layouts don't shift.
export default function AvatarFrame({
  frameId,
  size,
  children,
}: {
  frameId: string | null | undefined;
  size: number;
  children: React.ReactNode;
}) {
  const frame = frameById(frameId);
  if (!frame) return <>{children}</>;

  const ringWidth = Math.max(3, Math.round(size * 0.1));
  const outerSize = size + ringWidth * 2;

  const inner = (
    <View style={{ width: size, height: size, borderRadius: 999, overflow: 'hidden' }}>{children}</View>
  );

  if (frame.kind === 'gradient') {
    return (
      <LinearGradient
        colors={frame.colors.length === 2 ? frame.colors : [frame.colors[0], frame.colors[0]]}
        style={{ width: outerSize, height: outerSize, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View
      style={{
        width: outerSize, height: outerSize, borderRadius: 999, backgroundColor: frame.colors[0],
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {inner}
    </View>
  );
}
