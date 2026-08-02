import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { getPlayerPhoto } from '../lib/wikiLookup';
import { useTheme } from '../theme/ThemeContext';
import { CardRarity } from '../game/cardCollection';

const photoCache = new Map<string, string | null>();

// Frame color reflects card rarity when known (win overlay, collection —
// both already compute it for their own badges); omit it for contexts with
// no card to show off (e.g. the "you lost, here's who it was" screen).
export default function PlayerPortrait({ name, size = 200, rarity }: { name: string; size?: number; rarity?: CardRarity }) {
  const { colors, accent, fonts } = useTheme();
  const [url, setUrl] = useState<string | null>(photoCache.get(name) ?? null);

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
      {url ? (
        <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.28, color: '#ffe66b' }}>{init}</Text>
      )}
    </View>
  );
}
