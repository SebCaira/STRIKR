import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { clubColor, clubInit } from '../game/engine';
import { getClubLogo } from '../lib/wikiLookup';
import { useTheme } from '../theme/ThemeContext';

const logoCache = new Map<string, string | null>();

export default function ClubShield({ name, size = 40 }: { name: string; size?: number }) {
  const { fonts } = useTheme();
  const [url, setUrl] = useState<string | null>(logoCache.get(name) ?? null);

  useEffect(() => {
    let cancelled = false;
    if (logoCache.has(name)) {
      setUrl(logoCache.get(name) ?? null);
      return;
    }
    getClubLogo(name).then((u) => {
      logoCache.set(name, u);
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  const radius = size >= 40 ? 10 : 8;
  const fs = size >= 40 ? 15 : 10;
  const logoSize = Math.round(size * 1.25);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
      ) : (
        <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: clubColor(name), alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: fs, color: '#fff' }}>{clubInit(name)}</Text>
        </View>
      )}
    </View>
  );
}
