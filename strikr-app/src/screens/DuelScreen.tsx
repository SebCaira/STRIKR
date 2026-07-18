import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useDuel } from '../game/useDuel';
import { PLAYERS } from '../data/players';
import { stripAcc } from '../game/engine';
import HardShadowBox from '../components/HardShadowBox';

export default function DuelScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { duel, loading, myRole, createDuel, joinDuel, playCell, forfeit, clearFinished } = useDuel();

  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [cellError, setCellError] = useState<string | null>(null);

  const onCreate = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await createDuel();
    setBusy(false);
    if (error) setMessage(error);
  };

  const onJoin = async () => {
    if (!joinCode.trim()) return;
    setBusy(true);
    setMessage(null);
    const { error } = await joinDuel(joinCode.trim());
    setBusy(false);
    if (error) setMessage(t('duel_error_code'));
    else setJoinCode('');
  };

  const copyCode = async () => {
    if (!duel) return;
    await Clipboard.setStringAsync(duel.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openCell = (index: number) => {
    if (!duel || duel.status !== 'active' || duel.turn !== myRole || duel.cells[index].owner) return;
    setSelectedCell(index);
    setAnswer('');
    setCellError(null);
  };

  const submitAnswer = async () => {
    if (selectedCell === null || !answer.trim()) return;
    const { error } = await playCell(selectedCell, answer.trim());
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  // No duel yet: create or join.
  if (!duel) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.ink, letterSpacing: -0.5 }}>
            {t('nav_duel')}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 18 }}>{t('duel_intro')}</Text>

          <Pressable
            onPress={onCreate}
            disabled={busy}
            style={{ padding: 16, backgroundColor: accent.coral, borderWidth: 2.5, borderColor: colors.border, borderRadius: 14, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: fonts.display, fontSize: 14, color: '#fff' }}>{t('duel_create')}</Text>}
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder={t('duel_join_placeholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 2, borderColor: colors.border, borderRadius: 12, fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}
            />
            <Pressable onPress={onJoin} style={{ paddingHorizontal: 16, justifyContent: 'center', backgroundColor: accent.blue, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>{t('duel_join')}</Text>
            </Pressable>
          </View>

          {message && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>{message}</Text>}
        </ScrollView>
      </View>
    );
  }

  // Waiting for an opponent to join.
  if (duel.status === 'waiting') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ActivityIndicator color={colors.muted} />
        <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, textAlign: 'center' }}>{t('duel_waiting_title')}</Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted }}>{t('duel_waiting_code_label')}</Text>
        <Pressable onPress={copyCode} style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink, letterSpacing: 3 }}>{copied ? t('duel_copied') : duel.code}</Text>
        </Pressable>
        <Pressable onPress={forfeit} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted }}>{t('duel_cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  // Finished.
  if (duel.status === 'finished') {
    const won = duel.winner === myRole;
    const title = duel.winner === 'draw' ? t('duel_draw_title') : won ? t('duel_win_title') : t('duel_lose_title');
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 48 }}>{duel.winner === 'draw' ? '🤝' : won ? '🏆' : '😔'}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.ink }}>{title}</Text>
        <Pressable onPress={clearFinished} style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('duel_new')}</Text>
        </Pressable>
      </View>
    );
  }

  // Active gameplay.
  const isMyTurn = duel.turn === myRole;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: fonts.display, fontSize: 14, color: isMyTurn ? accent.coral : colors.muted,
          }}
        >
          {isMyTurn ? t('duel_your_turn') : t('duel_opponent_turn')}
        </Text>
        <Pressable onPress={forfeit}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>{t('duel_forfeit')}</Text>
        </Pressable>
      </View>

      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 78 }} />
          {duel.grid.cols.map((c, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 6 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: colors.ink, textAlign: 'center' }}>{c.label}</Text>
            </View>
          ))}
        </View>
        {duel.grid.rows.map((r, ri) => (
          <View key={ri} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ width: 78, paddingRight: 6 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: colors.ink }} numberOfLines={2}>{r.label}</Text>
            </View>
            {duel.grid.cols.map((_, ci) => {
              const index = ri * 3 + ci;
              const cell = duel.cells[index];
              const mine = cell.owner === myRole;
              return (
                <Pressable
                  key={ci}
                  onPress={() => openCell(index)}
                  style={{ flex: 1, aspectRatio: 1, marginHorizontal: 3, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: cell.owner ? (mine ? accent.mint : accent.wrongRed) : colors.card, padding: 4 }}
                >
                  {cell.owner ? (
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
            <TextInput
              value={answer}
              onChangeText={(v) => {
                setAnswer(v);
                setCellError(null);
              }}
              placeholder={t('duel_answer_placeholder')}
              placeholderTextColor={colors.muted}
              autoFocus
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
      </Modal>
    </View>
  );
}
