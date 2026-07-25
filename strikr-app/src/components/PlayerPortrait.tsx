import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getPlayerPhoto } from '../lib/wikiLookup';
import { useTheme } from '../theme/ThemeContext';

const photoCache = new Map<string, string | null>();

export default function PlayerPortrait({ name, size = 200 }: { name: string; size?: number }) {
  const { colors, fonts } = useTheme();
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

  return (
    <View style={{ width: size, height: size }}>
      <LinearGradient
        colors={['#2b3ff2', '#ff5a3c', '#ffe66b', '#a8f5c6', '#2b3ff2']}
        style={{
          width: '100%', height: '100%', borderRadius: 999, padding: 6,
          borderWidth: 0, shadowColor: colors.border, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
        }}
      >
        <View
          style={{
            width: '100%', height: '100%', borderRadius: 999, backgroundColor: '#1a1a1a',
            borderWidth: 3, borderColor: colors.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {url ? (
            <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Text style={{ fontFamily: fonts.display, fontSize: size * 0.28, color: '#ffe66b' }}>{init}</Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}
