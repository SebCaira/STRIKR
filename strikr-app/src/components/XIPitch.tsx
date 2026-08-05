// "XI Type" formation view: places each of the 11 players on a pitch at
// roughly their real position (GK at the bottom, forwards at the top)
// instead of the plain chip list Mode Liste uses — XI Type is the only
// pool with position data (see data/xiMatches.ts's `pos` field) to do this.
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { QuizPlayer, playerFull, playerPhoto, playerPos } from '../data/quizLists';
import PlayerPortrait from './PlayerPortrait';

// Vertical band (0 = own goal/GK, 100 = opponent's goal) per position code.
const ROW_Y: Record<string, number> = {
  GK: 91,
  CB: 72, RB: 72, LB: 72, RWB: 72, LWB: 72,
  DM: 56, CM: 56,
  AM: 38, RM: 38, LM: 38, RW: 38, LW: 38,
  CF: 16, SS: 16, RF: 16, LF: 16,
};

// Left-to-right ordering within a row: L-coded positions go left, R-coded
// go right, everything else (CB, CM, CF, GK...) stays centered.
function bias(pos: string | undefined): number {
  if (!pos) return 0;
  if (pos.startsWith('L')) return -1;
  if (pos.startsWith('R')) return 1;
  return 0;
}

const LABEL_W = 60;

export default function XIPitch({
  players,
  foundIndexes,
  avatarSize = 32,
  colorForIndex,
}: {
  players: QuizPlayer[];
  foundIndexes: number[];
  avatarSize?: number;
  // Duel mode wants found players tinted by who found them (mint = me, red
  // = opponent) instead of the plain white used everywhere else.
  colorForIndex?: (i: number) => string | undefined;
}) {
  const { fonts } = useTheme();

  const rows = new Map<number, number[]>();
  players.forEach((p, i) => {
    const y = ROW_Y[playerPos(p) || ''] ?? 50;
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y)!.push(i);
  });
  rows.forEach((idxs) => idxs.sort((a, b) => bias(playerPos(players[a])) - bias(playerPos(players[b]))));

  const spots: { i: number; x: number; y: number }[] = [];
  rows.forEach((idxs, y) => {
    const n = idxs.length;
    idxs.forEach((i, k) => {
      const x = n === 1 ? 50 : 16 + (68 * k) / (n - 1);
      spots.push({ i, x, y });
    });
  });

  return (
    <View
      style={{
        width: '100%', aspectRatio: 1.05, backgroundColor: '#2f9e44',
        borderRadius: 16, borderWidth: 3, borderColor: '#fff', overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute', left: '50%', top: '50%', width: 90, height: 90,
          marginLeft: -45, marginTop: -45, borderRadius: 45, borderWidth: 2, borderColor: 'rgba(255,255,255,.5)',
        }}
      />
      <View style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, backgroundColor: 'rgba(255,255,255,.5)' }} />
      <View style={{ position: 'absolute', left: '22%', right: '22%', bottom: 0, height: '13%', borderWidth: 2, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,.5)' }} />
      <View style={{ position: 'absolute', left: '22%', right: '22%', top: 0, height: '13%', borderWidth: 2, borderTopWidth: 0, borderColor: 'rgba(255,255,255,.5)' }} />

      {spots.map(({ i, x, y }) => {
        const found = foundIndexes.includes(i);
        const photo = found ? playerPhoto(players[i]) : undefined;
        const tint = found ? colorForIndex?.(i) || '#fff' : 'rgba(255,255,255,.28)';
        return (
          <View
            key={i}
            style={{
              position: 'absolute', left: `${x}%`, top: `${y}%`,
              width: LABEL_W, marginLeft: -LABEL_W / 2, marginTop: -avatarSize / 2,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: avatarSize, height: avatarSize, borderRadius: avatarSize * 0.22,
                backgroundColor: tint,
                borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}
            >
              {photo ? (
                <PlayerPortrait name={photo} size={avatarSize} variant="square" />
              ) : (
                <Text style={{ fontFamily: fonts.displayBold, fontSize: avatarSize * 0.36, color: '#fff' }}>
                  {found ? '' : '?'}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{ marginTop: 2, fontFamily: fonts.bodySemibold, fontSize: 9, color: '#fff', textAlign: 'center', width: LABEL_W }}
            >
              {found ? playerFull(players[i]) : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
