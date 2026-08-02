// Run from strikr-app/ with: node patch-portrait-frame.js
const fs = require('fs');

function patch(file, oldStr, newStr) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(oldStr)) {
    console.log('SKIP (not found, check manually):', file, '::', oldStr.slice(0, 60));
    return;
  }
  fs.writeFileSync(file, content.replace(oldStr, newStr));
  console.log('PATCHED:', file);
}

// 1) PlayerPortrait.tsx: full rewrite — rounded rectangle, rarity-colored border
// instead of the circular rainbow-gradient frame.
fs.writeFileSync(
  'src/components/PlayerPortrait.tsx',
  `import React, { useEffect, useState } from 'react';
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
`
);
console.log('PATCHED (full rewrite):', 'src/components/PlayerPortrait.tsx');

// 2) CollectionScreen.tsx
patch(
  'src/screens/CollectionScreen.tsx',
  `  const rarityBorder: Record<CardRarity, string> = { commune: colors.border, rare: accent.blue, legendaire: accent.yellow };
  const rarityBg: Record<CardRarity, string> = { commune: colors.card, rare: accent.blue, legendaire: accent.yellow };`,
  `  const rarityBg: Record<CardRarity, string> = { commune: colors.card, rare: accent.blue, legendaire: accent.yellow };`
);

patch(
  'src/screens/CollectionScreen.tsx',
  `              {owned ? (
                <View style={{ borderWidth: 3, borderColor: rarityBorder[rarity], borderRadius: 999 }}>
                  <PlayerPortrait name={p.n} size={64} />
                </View>
              ) : (
                <View
                  style={{
                    width: 64, height: 64, borderRadius: 999, backgroundColor: colors.card,
                    borderWidth: 2, borderColor: colors.muted, borderStyle: 'dashed',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.muted }}>?</Text>
                </View>
              )}`,
  `              {owned ? (
                <PlayerPortrait name={p.n} size={64} rarity={rarity} />
              ) : (
                <View
                  style={{
                    width: 64, height: 64, borderRadius: 64 * 0.14, backgroundColor: colors.card,
                    borderWidth: 2, borderColor: colors.muted, borderStyle: 'dashed',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.muted }}>?</Text>
                </View>
              )}`
);

patch(
  'src/screens/CollectionScreen.tsx',
  `              <PlayerPortrait name={selected.n} size={100} />`,
  `              <PlayerPortrait name={selected.n} size={100} rarity={cardRarity(selected)} />`
);

// 3) GameScreen.tsx — win overlay portrait gets the rarity it already computes
patch(
  'src/screens/GameScreen.tsx',
  `          <View style={{ paddingHorizontal: 22, paddingTop: 22, alignItems: 'center' }}>
            <PlayerPortrait name={player.n} size={200} />
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: '#1a1a1a', letterSpacing: 3, marginTop: 16 }}>✦ {t('game_found_at')} {solveOrd} {t('game_found_club')} ✦</Text>`,
  `          <View style={{ paddingHorizontal: 22, paddingTop: 22, alignItems: 'center' }}>
            <PlayerPortrait name={player.n} size={200} rarity={rarity} />
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: '#1a1a1a', letterSpacing: 3, marginTop: 16 }}>✦ {t('game_found_at')} {solveOrd} {t('game_found_club')} ✦</Text>`
);

// 4) DailyScreen.tsx
patch(
  'src/screens/DailyScreen.tsx',
  `import PlayerPortrait from '../components/PlayerPortrait';`,
  `import PlayerPortrait from '../components/PlayerPortrait';
import { cardRarity } from '../game/cardCollection';`
);

patch(
  'src/screens/DailyScreen.tsx',
  `            <PlayerPortrait name={state.player.n} size={128} />`,
  `            <PlayerPortrait name={state.player.n} size={128} rarity={cardRarity(state.player)} />`
);

console.log('Done. Verify each line above says PATCHED, then commit + push.');
