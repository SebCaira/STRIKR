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

// Natural dimensions per photo URL, used to anchor the crop toward the top
// instead of resizeMode="cover"'s default centered crop. Wikidata player
// photos are rarely tight headshots — most are standing/action shots with
// the face in the upper portion and legs/background filling the rest, so a
// centered crop on a square/circular frame regularly cut off the top of
// the head while keeping empty jersey/background at the bottom. Anchoring
// to the top keeps the face in frame; the bottom is what gets cropped.
const dimsCache = new Map<string, { w: number; h: number }>();

// Frame color reflects card rarity when known (win overlay, collection —
// both already compute it for their own badges); omit it for contexts with
// no card to show off (e.g. the "you lost, here's who it was" screen).
//
// variant='avatar' is for small inline uses (a found-player chip in Mode
// Liste) — a thin circular border instead of the thick rectangular "card"
// frame, which looks disproportionate much below its 200px default.
// variant='square' is the same thin-border treatment but a lightly rounded
// square instead of a circle (XI Type's pitch spots).
export default function PlayerPortrait({
  name,
  size = 200,
  rarity,
  variant = 'card',
}: {
  name: string;
  size?: number;
  rarity?: CardRarity;
  variant?: 'card' | 'avatar' | 'square';
}) {
  const { colors, accent, fonts } = useTheme();
  const [url, setUrl] = useState<string | null>(photoCache.get(name) ?? null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(url ? dimsCache.get(url) ?? null : null);
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

  useEffect(() => {
    if (!url) {
      setDims(null);
      return;
    }
    const cached = dimsCache.get(url);
    if (cached) {
      setDims(cached);
      return;
    }
    let cancelled = false;
    Image.getSize(
      url,
      (w, h) => {
        if (cancelled) return;
        dimsCache.set(url, { w, h });
        setDims({ w, h });
      },
      () => {
        // Couldn't read natural size (network hiccup) — fall back to a
        // plain centered cover rather than blocking the image entirely.
      }
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  const onImageLoad = () => {
    if (fadedIn.has(name)) return;
    fadedIn.add(name);
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  const parts = name.split(' ');
  const init = ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();

  const rarityBorder: Record<CardRarity, string> = { commune: colors.border, rare: accent.blue, legendaire: accent.yellow };
  const borderColor = rarity ? rarityBorder[rarity] : colors.border;

  const thinBorderStyle = (radius: number) => ({
    width: size, height: size, borderRadius: radius, backgroundColor: '#1a1a1a',
    borderWidth: 1.5, borderColor, overflow: 'hidden' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
  });

  const style =
    variant === 'avatar'
      ? thinBorderStyle(size / 2)
      : variant === 'square'
      ? thinBorderStyle(size * 0.2)
      : {
          width: size, height: size, borderRadius: size * 0.14, backgroundColor: '#1a1a1a',
          borderWidth: 4, borderColor, overflow: 'hidden' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
          shadowColor: colors.border, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
        };

  // Once natural dimensions are known, scale to cover the frame and anchor
  // the crop to the top (centered horizontally) instead of the centered
  // crop resizeMode="cover" would otherwise apply on its own.
  let imageStyle: any = { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, opacity };
  if (dims && dims.w > 0 && dims.h > 0) {
    const scale = Math.max(size / dims.w, size / dims.h);
    const scaledWidth = dims.w * scale;
    const scaledHeight = dims.h * scale;
    imageStyle = {
      position: 'absolute',
      width: scaledWidth,
      height: scaledHeight,
      top: 0,
      left: -(scaledWidth - size) / 2,
      opacity,
    };
  }

  return (
    <View style={style}>
      {!url && <Text style={{ fontFamily: fonts.display, fontSize: size * 0.28, color: '#ffe66b' }}>{init}</Text>}
      {url && <Animated.Image source={{ uri: url }} onLoad={onImageLoad} style={imageStyle} resizeMode="cover" />}
    </View>
  );
}
