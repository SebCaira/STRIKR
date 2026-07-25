import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  bg?: string;
  borderColor?: string;
  shadowColor?: string;
  radius?: number;
  offset?: number;
  borderWidth?: number;
}

// Recreates the design's signature "sticker" look: a solid offset shadow
// (no blur) behind a hard-bordered card. Implemented as a solid rectangle
// behind the card rather than native shadow props, since RN's shadow* /
// elevation don't reliably produce a crisp offset square on both platforms.
export default function HardShadowBox({
  children,
  style,
  bg,
  borderColor,
  shadowColor,
  radius = 14,
  offset = 3,
  borderWidth = 2,
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={[{ position: 'relative' }, style]}>
      <View
        style={{
          position: 'absolute',
          top: offset,
          left: offset,
          right: -offset,
          bottom: -offset,
          backgroundColor: shadowColor || colors.border,
          borderRadius: radius,
        }}
      />
      <View
        style={{
          backgroundColor: bg || colors.card,
          borderRadius: radius,
          borderWidth,
          borderColor: borderColor || colors.border,
        }}
      >
        {children}
      </View>
    </View>
  );
}
