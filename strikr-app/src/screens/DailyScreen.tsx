import React, { useEffect } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useDailyEngine } from '../game/useDailyEngine';
import { MAX_ROWS } from '../game/dailyEngine';
import PlayerPortrait from '../components/PlayerPortrait';

const TILE_COLORS = {
  exact: { bg: '#ffe66b', fg: '#1a1a1a' },
  present: { bg: '#ffffff', fg: '#1a1a1a' },
  absent: { bg: '#2b3ff2', fg: '#ffffff' },
} as const;

const KEY_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];

export default function DailyScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { state, diamonds, letterState, justCompleted, clearJustCompleted, typeLetter, backspace, submitGuess } =
    useDailyEngine();

  const n = state.target.length;
  const rewardForTries = (tries: number) => (tries === 1 ? 50 : tries <= 3 ? 25 : 10);

  useEffect(() => {
    if (!justCompleted) return;
    const timer = setTimeout(() => {
      clearJustCompleted();
      navigation.goBack();
    }, 1800);
    return () => clearTimeout(timer);
  }, [justCompleted, clearJustCompleted, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink }}>←</Text>
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: accent.coral, letterSpacing: 1.4, textTransform: 'uppercase' }}>{t('daily_kicker')}</Text>
          <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: accent.mint, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: '#1a1a1a' }}>💎 {diamonds}</Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginTop: 6, letterSpacing: -0.4 }}>
          {t('daily_title_pre')}<Text style={{ color: accent.coral }}>{t('daily_title_accent')}</Text>{t('daily_title_suf')}
        </Text>

        {state.status === 'won' && (
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <PlayerPortrait name={state.player.n} size={128} />
          </View>
        )}

        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4, textAlign: 'center' }}>
          {state.status === 'won'
            ? `✓ ${t('daily_found_in')} ${state.guesses.length}/${MAX_ROWS} · ${state.player.n} · +${rewardForTries(state.guesses.length)} 💎`
            : state.status === 'lost'
            ? `✗ ${t('daily_lost')} ${state.player.n}`
            : `${t('daily_try')} ${state.guesses.length + 1} / ${MAX_ROWS} · ${n} ${t('daily_letters')}`}
        </Text>

        {state.status === 'playing' && (
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            {(['exact', 'present', 'absent'] as const).map((kind) => (
              <View key={kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View
                  style={{
                    width: 14, height: 14, borderRadius: 3, borderWidth: 1.5, borderColor: colors.border,
                    backgroundColor: TILE_COLORS[kind].bg,
                  }}
                />
                <Text style={{ fontFamily: fonts.body, fontSize: 10, color: colors.muted }}>{t(`daily_legend_${kind}`)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16, gap: 5 }}>
        {Array.from({ length: MAX_ROWS }).map((_, r) => {
          let cells: { letter: string; kind: 'exact' | 'present' | 'absent' | 'empty' | 'typed' }[];
          if (r < state.guesses.length) {
            const g = state.guesses[r];
            cells = g.letters.map((l, i) => ({ letter: l, kind: g.feedback[i] }));
          } else if (r === state.guesses.length && state.status === 'playing') {
            cells = state.current.map((l, i) => ({
              letter: l,
              kind: state.locked[i] ? 'exact' : l ? 'typed' : 'empty',
            }));
          } else {
            cells = new Array(n).fill(null).map(() => ({ letter: '', kind: 'empty' as const }));
          }
          return (
            <View key={r} style={{ flexDirection: 'row', gap: 5, justifyContent: 'center' }}>
              {cells.map((c, i) => {
                const style =
                  c.kind === 'empty'
                    ? { bg: colors.bg, fg: colors.ink, border: 'rgba(0,0,0,.15)' }
                    : c.kind === 'typed'
                    ? { bg: colors.card, fg: colors.ink, border: colors.border }
                    : { bg: TILE_COLORS[c.kind].bg, fg: TILE_COLORS[c.kind].fg, border: colors.border };
                return (
                  <View
                    key={i}
                    style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: style.bg, borderWidth: 2, borderColor: style.border, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontFamily: fonts.display, fontSize: 18, color: style.fg }}>{c.letter}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={{ paddingHorizontal: 14, paddingBottom: Math.max(20, insets.bottom + 10), gap: 4 }}>
        {KEY_ROWS.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
            {ri === 2 && <View style={{ flex: 0.5 }} />}
            {row.split('').map((l) => {
              const st = letterState[l];
              const bg = st ? TILE_COLORS[st].bg : colors.card;
              const fg = st ? TILE_COLORS[st].fg : colors.ink;
              return (
                <Pressable
                  key={l}
                  onPress={() => typeLetter(l)}
                  style={{ flex: 1, height: 40, borderRadius: 6, backgroundColor: bg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: fg }}>{l}</Text>
                </Pressable>
              );
            })}
            {ri === 2 && <View style={{ flex: 0.5 }} />}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          <Pressable onPress={backspace} style={{ flex: 1, height: 40, borderRadius: 8, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('daily_backspace')}</Text>
          </Pressable>
          <Pressable onPress={submitGuess} style={{ flex: 1.4, height: 40, borderRadius: 8, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: '#fff' }}>{t('daily_submit')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
