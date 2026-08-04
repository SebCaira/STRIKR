import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Text, View } from 'react-native';
import { getPlayerPhoto } from '../lib/wikiLookup';
import { useTheme } from '../theme/ThemeContext';
import { CardRarity } from '../game/cardCollection';

const photoCache = new Map<string, string | null>();
// Photos that already finished a fade-in once this session don't need to
// fade again if the same portrait remounts (e.g. navigating back and forth)
// — only the very first appearance should feel like a reveal.
const fadedIn = new Set<string>();

// Frame color reflects card rarity when known (win overlay, collection —
// both already compute it for their own badges); omit it for contexts with
// no card to show off (e.g. the "you lost, here's who it was" screen).
export default function PlayerPortrait({ name, size = 200, rarity }: { name: string; size?: number; rarity?: CardRarity }) {
  const { colors, accent, fonts } = useTheme();
  const [url, setUrl] = useState<string | null>(photoCache.get(name) ?? null);
  const opacity = useRef(new Animated.Value(fadedIn.has(name) ? 1 : 0)).current;

  useEffect(() => {
    let cancelled = false;
    if (photoCache.has(name)) {
      setUrl(photoCache.get(name) ?? null);
      return;
    }
    getPlayerPhoto(name).then((u) => {
      photoCache.set(name, u);
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  const onImageLoad = () => {
    if (fadedIn.has(name)) return;
    fadedIn.add(name);
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  const parts = name.split(' ');
  const init = ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();

  const rarityBorder: Record<CardRarity, string> = { commune: colors.border, rare: accent.blue, legendaire: accent.yellow };
  const borderColor = rarity ? rarityBorder[rarity] : colors.border;

  return (
    <View
      style={{
        width: size, height: size, borderRadius: size * 0.14, backgroundColor: '#1a1a1a',
        borderWidth: 4, borderColor, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
        shadowColor: colors.border, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
      }}
    >
      {!url && <Text style={{ fontFamily: fonts.display, fontSize: size * 0.28, color: '#ffe66b' }}>{init}</Text>}
      {url && (
        <Animated.Image
          source={{ uri: url }}
          onLoad={onImageLoad}
          style={{ position: 'absolute', width: '100%', height: '100%', opacity }}
          resizeMode="cover"
        />
      )}
    </View>
  );
}
