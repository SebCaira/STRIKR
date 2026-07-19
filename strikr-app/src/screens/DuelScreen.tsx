import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { DUEL_TURN_SECONDS, useDuel } from '../game/useDuel';
import { PLAYERS } from '../data/players';
import { stripAcc } from '../game/engine';
import HardShadowBox from '../components/HardShadowBox';
import ClubShield from '../components/ClubShield';
import SoloGridScreen from './SoloGridScreen';
import { TabParamList } from '../navigation/TabNavigator';
import { flagEmoji } from '../lib/flags';

const KEY_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];

export default function DuelScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<TabParamList, 'Duel'>>();
  const { duel, loading, myRole, createDuel, joinDuel, playCell, passTurn, forfeit, clearFinished } = useDuel();

  // Came here via LeagueScreen's "challenge" button: create a duel once
  // loading has settled and we know there's no active one already, then
  // clear the param so refocusing this tab later doesn't fire it again.
  useEffect(() => {
    if (!route.params?.autoCreate || loading || duel) return;
    createDuel();
    navigation.setParams({ autoCreate: undefined });
  }, [route.params?.autoCreate, loading, duel, createDuel, navigation]);

  const [solo, setSolo] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [cellError, setCellError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const updateAnswer = (next: string) => {
    setAnswer(next);
    setCellError(null);
  };

  // Per-turn countdown, ticked locally from turn_started_at. Only the player
  // on the clock passes their own turn when it runs out — the other client
  // is just watching and will pick up the resulting realtime update.
  useEffect(() => {
    if (!duel || duel.status !== 'active') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [duel?.status, duel?.id]);

  const secondsLeft =
    duel && duel.status === 'active'
      ? Math.max(0, DUEL_TURN_SECONDS - Math.floor((now - new Date(duel.turn_started_at).getTime()) / 1000))
      : DUEL_TURN_SECONDS;

  useEffect(() => {
    if (!duel || duel.status !== 'active' || duel.turn !== myRole) return;
    if (secondsLeft === 0) passTurn();
  }, [secondsLeft, duel?.status, duel?.turn, myRole, passTurn]);

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

  if (solo) {
    return <SoloGridScreen onExit={() => setSolo(false)} />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  // No duel yet: create, join, or play solo.
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

          <Pressable
            onPress={() => setSolo(true)}
            style={{ padding: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 14, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{t('duel_solo_play')}</Text>
          </Pressable>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              fontFamily: fonts.display, fontSize: 14, color: isMyTurn ? accent.coral : colors.muted,
            }}
          >
            {isMyTurn ? t('duel_your_turn') : t('duel_opponent_turn')}
          </Text>
          <View style={{ paddingVertical: 3, paddingHorizontal: 8, backgroundColor: secondsLeft <= 10 ? accent.wrongRed : colors.track, borderRadius: 999 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: secondsLeft <= 10 ? '#fff' : colors.muted }}>⏱ {secondsLeft}s</Text>
          </View>
        </View>
        <Pressable onPress={forfeit}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>{t('duel_forfeit')}</Text>
        </Pressable>
      </View>

      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 78 }} />
          {duel.grid.cols.map((c, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 6, gap: 3 }}>
              {c.type === 'nat' && <Text style={{ fontSize: 28 }}>{flagEmoji(c.value)}</Text>}
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: colors.ink, textAlign: 'center' }}>{c.label}</Text>
            </View>
          ))}
        </View>
        {duel.grid.rows.map((r, ri) => (
          <View key={ri} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ width: 78, paddingRight: 6, alignItems: 'center', gap: 3 }}>
              {r.type === 'club' && <ClubShield name={r.value} size={34} />}
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: colors.ink, textAlign: 'center' }} numberOfLines={2}>{r.label}</Text>
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
