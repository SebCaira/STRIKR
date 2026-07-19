import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useSoloGrid } from '../game/useSoloGrid';
import { PLAYERS } from '../data/players';
import { stripAcc } from '../game/engine';
import ClubShield from '../components/ClubShield';

export default function SoloGridScreen({ onExit }: { onExit: () => void }) {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { state, playCell, newGrid, rewardsExhausted, rewardedToday, rewardedLimit } = useSoloGrid();

  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [cellError, setCellError] = useState<string | null>(null);
  const answerInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (selectedCell === null) return;
    const timer = setTimeout(() => answerInputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [selectedCell]);

  const openCell = (index: number) => {
    if (state.status !== 'playing' || state.cells[index].name) return;
    setSelectedCell(index);
    setAnswer('');
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
            <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 6 }}>
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }} onPress={() => setSelectedCell(null)}>
            <Pressable style={{ backgroundColor: colors.bg, borderTopWidth: 2.5, borderColor: colors.border, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Math.max(20, insets.bottom + 12) }}>
              <TextInput
                ref={answerInputRef}
                value={answer}
                onChangeText={(v) => {
                  setAnswer(v);
                  setCellError(null);
                }}
                placeholder={t('duel_answer_placeholder')}
                placeholderTextColor={colors.muted}
                style={{ paddingVertical: 12, paddingHorizontal: 14, borderWidth: 2, borderColor: colors.border, borderRadius: 12, fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink }}
              />
              {suggestions.length > 0 && (
                <View style={{ marginTop: 6, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
                  {suggestions.map((s) => (
                    <Pressable key={s.n} onPress={() => setAnswer(s.n)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.06)' }}>
                      <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{s.n}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {cellError && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: accent.coral, marginTop: 8 }}>{cellError}</Text>}
              <Pressable onPress={submitAnswer} style={{ marginTop: 12, paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('duel_validate')}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
