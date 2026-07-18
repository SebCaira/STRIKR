import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  children: React.ReactNode;
  bg?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  outlined?: boolean;
}

export default function Pill({ children, bg, color, style, outlined }: Props) {
  const { colors, fonts } = useTheme();
  return (
    <View
      style={[
        {
          paddingVertical: 4,
          paddingHorizontal: 9,
          backgroundColor: outlined ? 'transparent' : bg || colors.card,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: 999,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: color || colors.ink }}>{children}</Text>
    </View>
  );
}
