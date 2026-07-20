import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useSoloGrid } from '../game/useSoloGrid';
import { PLAYERS } from '../data/players';
import { stripAcc } from '../game/engine';
import ClubShield from '../components/ClubShield';
import { flagEmoji } from '../lib/flags';

const KEY_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];

export default function SoloGridScreen({ onExit }: { onExit: () => void }) {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { state, playCell, newGrid, rewardsExhausted, rewardedToday, rewardedLimit } = useSoloGrid();

  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [cellError, setCellError] = useState<string | null>(null);

  const openCell = (index: number) => {
    if (state.status !== 'playing' || state.cells[index].name) return;
    setSelectedCell(index);
    setAnswer('');
    setCellError(null);
  };

  const updateAnswer = (next: string) => {
    setAnswer(next);
    setCellError(null);
  };

  const submitAnswer = () => {
    if (selectedCell === null || !answer.trim()) return;
    const { error } = playCell(selectedCell, answer.trim());
    if (error) {
      setCellError(error === 'player_used' ? t('duel_error_used') : t('duel_error_invalid'));
      return;
    }
    setSelectedCell(null);
    setAnswer('');
    setCellError(null);
  };

  const suggestions =
    answer.trim().length >= 2
      ? PLAYERS.filter((p) => stripAcc(p.n.toLowerCase()).includes(stripAcc(answer.trim().toLowerCase()))).slice(0, 5)
      : [];

  const filledCount = state.cells.filter((c) => c.name).length;

  if (state.status === 'won') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 48 }}>🏆</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.ink }}>{t('duel_solo_complete')}</Text>
        <Pressable onPress={newGrid} style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('duel_solo_new_grid')}</Text>
        </Pressable>
        <Pressable onPress={onExit} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted }}>{t('duel_solo_exit')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.ink }}>
            {t('duel_solo_progress')} {filledCount}/9
          </Text>
          <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, marginTop: 2 }}>
            {rewardsExhausted ? t('duel_solo_rewards_done') : `💎 ${rewardedToday}/${rewardedLimit} ${t('duel_solo_rewards_left')}`}
          </Text>
        </View>
        <Pressable onPress={onExit}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>{t('duel_solo_exit')}</Text>
        </Pressable>
      </View>

      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 78 }} />
          {state.grid.cols.map((c, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 6, gap: 3 }}>
              {c.type === 'nat' && <Text style={{ fontSize: 28 }}>{flagEmoji(c.value)}</Text>}
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: colors.ink, textAlign: 'center' }}>{c.label}</Text>
            </View>
          ))}
        </View>
        {state.grid.rows.map((r, ri) => (
          <View key={ri} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ width: 78, paddingRight: 6, alignItems: 'center', gap: 3 }}>
              {r.type === 'club' && <ClubShield name={r.value} size={34} />}
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: colors.ink, textAlign: 'center' }} numberOfLines={2}>{r.label}</Text>
            </View>
            {state.grid.cols.map((_, ci) => {
              const index = ri * 3 + ci;
              const cell = state.cells[index];
              return (
                <Pressable
                  key={ci}
                  onPress={() => openCell(index)}
                  style={{ flex: 1, aspectRatio: 1, marginHorizontal: 3, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: cell.name ? accent.mint : colors.card, padding: 4 }}
                >
                  {cell.name ? (
                    <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 9, color: '#1a1a1a', textAlign: 'center' }} numberOfLines={2}>{cell.name}</Text>
                  ) : (
                    <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>+</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <Modal visible={selectedCell !== null} transparent animationType="fade" onRequestClose={() => setSelectedCell(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }} onPress={() => setSelectedCell(null)}>
          <Pressable style={{ backgroundColor: colors.bg, borderTopWidth: 2.5, borderColor: colors.border, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Math.max(20, insets.bottom + 12) }}>
            <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14, color: answer ? colors.ink : colors.muted }}>
                {answer || t('duel_answer_placeholder')}
              </Text>
            </View>
            {suggestions.length > 0 && (
              <View style={{ marginTop: 6, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
                {suggestions.map((s) => (
                  <Pressable key={s.n} onPress={() => updateAnswer(s.n)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.06)' }}>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{s.n}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {cellError && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: accent.coral, marginTop: 8 }}>{cellError}</Text>}

            <View style={{ marginTop: 10, gap: 4 }}>
              {KEY_ROWS.map((row, ri) => (
                <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
                  {ri === 2 && <View style={{ flex: 0.5 }} />}
                  {row.split('').map((l) => (
                    <Pressable
                      key={l}
                      onPress={() => updateAnswer(answer + l)}
                      style={{ flex: 1, height: 38, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{l}</Text>
                    </Pressable>
                  ))}
                  {ri === 2 && <View style={{ flex: 0.5 }} />}
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable
                  onPress={() => updateAnswer(answer.slice(0, -1))}
                  style={{ flex: 1.4, height: 38, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('game_backspace')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => updateAnswer(answer + ' ')}
                  style={{ flex: 3, height: 38, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('game_space')}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable onPress={submitAnswer} style={{ marginTop: 12, paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('duel_validate')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
