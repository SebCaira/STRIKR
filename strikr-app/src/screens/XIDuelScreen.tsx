// "XI Type" duel: pick a famous match, challenge a friend, then take turns
// naming the starting eleven — 45s per name, most correct wins. Turn-based
// (unlike Mode Liste's duel, which races simultaneously), so this has its
// own hook (useXIDuel) and screen rather than reusing GroupGameScreen.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { XI_DUEL_TURN_SECONDS, useXIDuel } from '../game/useXIDuel';
import { useInterstitialAd } from '../game/useInterstitialAd';
import { XI_MATCHES } from '../data/xiMatches';
import { playerFull } from '../data/quizLists';
import { PLAYERS } from '../data/players';
import { useFriends } from '../state/friends';
import { stripAcc } from '../game/engine';
import RulesModal from '../components/RulesModal';
import { useRulesModal } from '../lib/useRulesModal';
import XIPitch from '../components/XIPitch';
import { KEY_ROWS_BY_LANG } from '../lib/keyboard';

function norm(s: string): string {
  return stripAcc(s.trim().toLowerCase()).replace(/[^a-z]/g, '');
}

interface XIDuelScreenProps {
  onBack?: () => void;
  // Set when arriving from FriendsScreen's "challenge" picker: fires the
  // invite straight to that friend as soon as a match is chosen, instead
  // of making the challenger pick them again from the list below.
  inviteUserId?: string;
  inviteUserName?: string;
  onInviteConsumed?: () => void;
}

export default function XIDuelScreen({ onBack, inviteUserId, inviteUserName, onInviteConsumed }: XIDuelScreenProps) {
  const { colors, accent, fonts } = useTheme();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const rules = useRulesModal('duel_xi');
  const { friends, loading: friendsLoading } = useFriends();
  const {
    duel, match, loading, myRole,
    inviteXIDuel, respondInvite, cancelInvite, guessName, passTurn, forfeit, clearFinished,
    lastReward, rewardedToday, rewardedLimit,
  } = useXIDuel();
  const { recordRoundPlayed } = useInterstitialAd();

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [rematching, setRematching] = useState(false);
  const [forfeitConfirmOpen, setForfeitConfirmOpen] = useState(false);

  const updateAnswer = (next: string) => {
    setAnswer(next);
    setAnswerError(null);
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
      ? Math.max(0, XI_DUEL_TURN_SECONDS - Math.floor((now - new Date(duel.turn_started_at).getTime()) / 1000))
      : XI_DUEL_TURN_SECONDS;

  useEffect(() => {
    if (!duel || duel.status !== 'active' || duel.turn !== myRole) return;
    if (secondsLeft === 0) passTurn();
  }, [secondsLeft, duel?.status, duel?.turn, myRole, passTurn]);

  const sendInvite = async (friendId: string, friendName: string) => {
    if (!selectedMatchId) return;
    const m = XI_MATCHES.find((x) => x.id === selectedMatchId);
    if (!m) return;
    setInviting(friendId);
    setMessage(null);
    const { error } = await inviteXIDuel(friendId, friendName, m.id, m.title);
    setInviting(null);
    // Only ever fails on 'not_authenticated' or a raw Supabase error string,
    // neither meant for display — always the generic translated message.
    if (error) setMessage(t('error_generic'));
  };

  // Ref (not state) so this can only ever fire once per mount, regardless
  // of how many times the effect re-runs while waiting on `duel` to update
  // from the realtime subscription.
  const invitedOnceRef = useRef(false);
  useEffect(() => {
    if (!inviteUserId || !selectedMatchId || invitedOnceRef.current) return;
    invitedOnceRef.current = true;
    sendInvite(inviteUserId, inviteUserName || '');
    onInviteConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteUserId, selectedMatchId]);

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    const { error } = await guessName(answer.trim());
    if (error) {
      setAnswerError(t('xi_duel_error_invalid'));
      return;
    }
    setAnswer('');
    setAnswerError(null);
  };

  // Suggests from the full player database (not just this match's 11) so
  // the list helps with spelling without doubling as an answer key — a
  // name showing up here no longer means it's necessarily correct.
  const foundNamesNorm = new Set(
    match ? (duel?.found ?? []).map((f) => norm(playerFull(match.players[f.index]))) : []
  );

  const suggestions =
    match && answer.trim().length >= 2
      ? PLAYERS
          .map((p) => p.n)
          .filter((n) => !foundNamesNorm.has(norm(n)))
          .filter((n) => norm(n).includes(norm(answer.trim())))
          .slice(0, 5)
      : [];

  const withBack = (node: React.ReactElement) => (
    <View style={{ flex: 1 }}>
      {node}
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={{ position: 'absolute', top: insets.top + 14, left: 16, width: 30, height: 30, borderRadius: 999, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.ink }}>←</Text>
        </Pressable>
      )}
      <Pressable
        onPress={rules.show}
        hitSlop={8}
        style={{ position: 'absolute', top: insets.top + 14, right: 16, width: 30, height: 30, borderRadius: 999, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>?</Text>
      </Pressable>
      <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_xi_title')} body={t('rules_xi_body')} />
    </View>
  );

  if (loading) {
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  // No duel yet: pick a match, then a friend to challenge.
  if (!duel) {
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.ink, letterSpacing: -0.5 }}>{t('jeux_game_xi')}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 18 }}>{t('xi_duel_intro')}</Text>

          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1 }}>{t('xi_duel_pick_match')}</Text>
          <View style={{ gap: 8 }}>
            {XI_MATCHES.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setSelectedMatchId(m.id)}
                style={{
                  padding: 14, borderRadius: 12, borderWidth: 2, borderColor: colors.border,
                  backgroundColor: selectedMatchId === m.id ? accent.coral : colors.card,
                }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: selectedMatchId === m.id ? '#fff' : colors.ink }}>{m.title}</Text>
              </Pressable>
            ))}
          </View>

          {selectedMatchId && (
            <>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1, marginTop: 6 }}>{t('xi_duel_pick_friend')}</Text>
              {friendsLoading ? (
                <ActivityIndicator color={colors.muted} />
              ) : friends.length === 0 ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>{t('friends_none')}</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {friends.map((f) => (
                    <Pressable
                      key={f.id}
                      onPress={() => sendInvite(f.id, f.display_name)}
                      disabled={!!inviting}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, opacity: inviting && inviting !== f.id ? 0.5 : 1 }}
                    >
                      <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{f.display_name}</Text>
                      {inviting === f.id ? <ActivityIndicator color={colors.muted} /> : <Text style={{ fontSize: 16 }}>⚔️</Text>}
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          {message && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>{message}</Text>}
        </ScrollView>
      </View>
    );
  }

  // I sent an invite and I'm waiting on the other person to respond.
  if (duel.status === 'invited' && myRole === 'creator') {
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ActivityIndicator color={colors.muted} />
        <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, textAlign: 'center' }}>
          {t('duel_invite_waiting_title').replace('{name}', duel.opponent_name || '')}
        </Text>
        <Pressable onPress={cancelInvite} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted }}>{t('duel_cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  // Someone invited me — accept or decline.
  if (duel.status === 'invited' && myRole === 'opponent') {
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 40 }}>🎽</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink, textAlign: 'center' }}>
          {t('duel_invite_received_title').replace('{name}', duel.creator_name || '')}
        </Text>
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.muted, textAlign: 'center' }}>{duel.match_title}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => respondInvite(false)} style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{t('duel_invite_decline')}</Text>
          </Pressable>
          <Pressable onPress={() => respondInvite(true)} style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('duel_invite_accept')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // The other person declined (or the invite was cancelled) — only ever
  // seen by the creator, since the decliner clears their own state locally.
  if (duel.status === 'declined') {
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 40 }}>😔</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, textAlign: 'center' }}>
          {t('duel_invite_declined_title').replace('{name}', duel.opponent_name || '')}
        </Text>
        <Pressable onPress={clearFinished} style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('duel_new')}</Text>
        </Pressable>
      </View>
    );
  }

  // Finished.
  if (duel.status === 'finished') {
    const won = duel.winner === myRole;
    const myScore = myRole === 'creator' ? duel.creator_score : duel.opponent_score;
    const otherScore = myRole === 'creator' ? duel.opponent_score : duel.creator_score;
    const title = duel.winner === 'draw' ? t('duel_draw_title') : won ? t('duel_win_title') : t('duel_lose_title');
    const opponentId = myRole === 'creator' ? duel.opponent_id : duel.creator_id;
    const opponentName = myRole === 'creator' ? duel.opponent_name : duel.creator_name;
    const rematch = () => {
      if (!opponentId) return;
      setRematching(true);
      inviteXIDuel(opponentId, opponentName || '', duel.match_id, duel.match_title).finally(() => setRematching(false));
    };
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 48 }}>{duel.winner === 'draw' ? '🤝' : won ? '🏆' : '😔'}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.ink }}>{title}</Text>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: colors.ink }}>{myScore} — {otherScore}</Text>
        {(won || duel.winner === 'draw') && (
          <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.muted }}>
            {lastReward > 0 ? `+${lastReward} 💎` : `💎 ${rewardedToday}/${rewardedLimit} ${t('club_rewards_left')}`}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {opponentId && (
            <Pressable disabled={rematching} onPress={() => recordRoundPlayed(rematch)} style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: colors.border, borderRadius: 12, opacity: rematching ? 0.6 : 1 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>⚔️ {t('duel_rematch')}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => recordRoundPlayed(clearFinished)} style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('duel_new')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Active gameplay.
  if (!match) {
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }
  const isMyTurn = duel.turn === myRole;
  const myScore = myRole === 'creator' ? duel.creator_score : duel.opponent_score;
  const otherScore = myRole === 'creator' ? duel.opponent_score : duel.creator_score;
  const foundByIndex = new Map(duel.found.map((f) => [f.index, f]));

  return withBack(
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink }} numberOfLines={2}>{duel.match_title}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 14, color: isMyTurn ? accent.coral : colors.muted }}>
              {isMyTurn ? t('duel_your_turn') : t('duel_opponent_turn')}
            </Text>
            <View style={{ paddingVertical: 3, paddingHorizontal: 8, backgroundColor: secondsLeft <= 10 ? accent.wrongRed : colors.track, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: secondsLeft <= 10 ? '#fff' : colors.muted }}>⏱ {secondsLeft}s</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{myScore} — {otherScore}</Text>
            <Pressable onPress={() => setForfeitConfirmOpen(true)}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>{t('duel_forfeit')}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={forfeitConfirmOpen} transparent animationType="fade" onRequestClose={() => setForfeitConfirmOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setForfeitConfirmOpen(false)}>
          <Pressable style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: accent.coral, borderRadius: 20, padding: 22, maxWidth: 340, width: '100%' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginBottom: 10 }}>{t('duel_forfeit_confirm_title')}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 19 }}>{t('duel_forfeit_confirm_body')}</Text>
            <Pressable
              onPress={() => {
                setForfeitConfirmOpen(false);
                forfeit();
              }}
              style={{ marginTop: 18, paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>{t('duel_forfeit_confirm_button')}</Text>
            </Pressable>
            <Pressable onPress={() => setForfeitConfirmOpen(false)} style={{ marginTop: 10, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted }}>{t('settings_delete_account_cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14 }} style={{ flex: 1 }}>
        <XIPitch
          players={match.players}
          foundIndexes={Array.from(foundByIndex.keys())}
          colorForIndex={(i) => {
            const f = foundByIndex.get(i);
            if (!f) return undefined;
            return f.by === myRole ? accent.mint : accent.wrongRed;
          }}
        />
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(12, insets.bottom + 8) }}>
        <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, opacity: isMyTurn ? 1 : 0.5 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14, color: answer ? colors.ink : colors.muted }}>
            {answer || t('duel_answer_placeholder')}
          </Text>
        </View>
        {suggestions.length > 0 && isMyTurn && (
          <View style={{ marginTop: 6, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
            {suggestions.map((s) => (
              <Pressable key={playerFull(s)} onPress={() => updateAnswer(playerFull(s))} style={{ paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.06)' }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{playerFull(s)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {answerError && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: accent.coral, marginTop: 8 }}>{answerError}</Text>}

        {isMyTurn && (
          <>
            <View style={{ marginTop: 10, gap: 4 }}>
              {KEY_ROWS_BY_LANG[lang].map((row, ri) => (
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
          </>
        )}
      </View>
    </View>
  );
}
