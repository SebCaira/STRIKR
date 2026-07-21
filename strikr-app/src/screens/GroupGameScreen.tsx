// "Groupe" mode for "Devine le joueur": up to 5 league friends race on the
// same mystery player at the same time. Local UI step machine layered over
// useGroupGame's DB-driven status (lobby/active/finished) — see that hook
// for the sync/reward model.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useAuth } from '../state/auth';
import { useAllLeagueFriends } from '../state/leagues';
import { useGroupGame } from '../game/useGroupGame';
import { Level, matchesGuess } from '../game/engine';
import ClubShield from '../components/ClubShield';
import RevealCard from '../components/RevealCard';
import HardShadowBox from '../components/HardShadowBox';
import RulesModal from '../components/RulesModal';
import { useRulesModal } from '../lib/useRulesModal';

const KEY_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
const DURATIONS = [60, 90, 120, 180];
const LEVEL_META: Record<Level, { icon: string; labelKey: string }> = {
  easy: { icon: '🟢', labelKey: 'quiz_difficulty_easy' },
  medium: { icon: '🟡', labelKey: 'quiz_difficulty_medium' },
  hard: { icon: '🔴', labelKey: 'quiz_difficulty_hard' },
};
const MAX_FRIENDS = 4;

export default function GroupGameScreen({ onBack }: { onBack?: () => void }) {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const rules = useRulesModal('group');
  const { user } = useAuth();
  const { friends, hasLeague, loading: friendsLoading } = useAllLeagueFriends();
  const {
    game,
    players,
    loading,
    mysteryPlayer,
    isCreator,
    createGroup,
    respondInvite,
    cancelLobby,
    startGame,
    submitResult,
    finishGame,
    leaveFinished,
    lastReward,
  } = useGroupGame();

  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [roundSeconds, setRoundSeconds] = useState(90);
  const [level, setLevel] = useState<Level>('medium');
  const [busy, setBusy] = useState(false);

  // Local per-round play state — only reported back via submitResult() at
  // solve or timeout, so other players never see live guesses, just the
  // eventual result.
  const [guess, setGuess] = useState('');
  const [wrongList, setWrongList] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [now, setNow] = useState(Date.now());
  const handledRoundRef = useRef<string | null>(null);

  const myRow = game ? players.find((p) => p.user_id === user?.id) : undefined;

  useEffect(() => {
    if (game && game.status === 'active' && mysteryPlayer && handledRoundRef.current !== game.id) {
      setGuess('');
      setWrongList([]);
      setRevealed(Math.max(1, Math.min(3, mysteryPlayer.clubs.length - 2)));
      setSolved(false);
    }
  }, [game?.id, game?.status, mysteryPlayer]);

  useEffect(() => {
    if (!game || game.status !== 'active') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [game?.status, game?.id]);

  const secondsLeft =
    game && game.status === 'active' && game.started_at
      ? Math.max(0, game.round_seconds - Math.floor((now - new Date(game.started_at).getTime()) / 1000))
      : 0;

  // Whoever's local countdown hits zero first reports (if not already
  // solved) and flips the shared row — see useGroupGame.finishGame for the
  // guard that makes a near-simultaneous second call harmless.
  useEffect(() => {
    if (!game || game.status !== 'active') return;
    if (secondsLeft > 0) return;
    if (handledRoundRef.current === game.id) return;
    handledRoundRef.current = game.id;
    if (!solved) submitResult(wrongList.length, null, false);
    finishGame();
  }, [secondsLeft, game?.id, game?.status, solved, wrongList.length, submitResult, finishGame]);

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_FRIENDS ? [...prev, id] : prev
    );
  };

  const handleCreate = async () => {
    if (!selectedFriendIds.length || busy) return;
    setBusy(true);
    const names = selectedFriendIds.map((id) => friends.find((f) => f.id === id)?.display_name || '');
    await createGroup(selectedFriendIds, names, roundSeconds);
    setBusy(false);
  };

  const handleStart = async () => {
    if (busy) return;
    setBusy(true);
    await startGame(level);
    setBusy(false);
  };

  const submitGuess = () => {
    if (!mysteryPlayer || solved || !game || game.status !== 'active' || !guess.trim()) return;
    if (matchesGuess(mysteryPlayer, guess)) {
      const attempt = wrongList.length + 1;
      const elapsed = game.started_at ? Date.now() - new Date(game.started_at).getTime() : null;
      setSolved(true);
      setRevealed(mysteryPlayer.clubs.length);
      setGuess('');
      submitResult(attempt, elapsed, true);
    } else {
      setWrongList((prev) => [...prev, guess.trim()]);
      setRevealed((prev) => Math.min(prev + 1, mysteryPlayer.clubs.length));
      setGuess('');
    }
  };

  const withBack = (node: React.ReactElement, opts?: { hideBack?: boolean }) => (
    <View style={{ flex: 1 }}>
      {node}
      {onBack && !opts?.hideBack && (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={{ position: 'absolute', top: insets.top + 14, left: 20, width: 30, height: 30, borderRadius: 999, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.ink }}>←</Text>
        </Pressable>
      )}
      <Pressable
        onPress={rules.show}
        hitSlop={8}
        style={{ position: 'absolute', top: insets.top + 14, right: 20, width: 30, height: 30, borderRadius: 999, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>?</Text>
      </Pressable>
      <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_group_title')} body={t('rules_group_body')} />
    </View>
  );

  if (loading) {
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  // No active game: create a lobby.
  if (!game) {
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 60, paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{t('group_create_title')}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 }}>{t('group_create_sub')}</Text>

        {!hasLeague && !friendsLoading ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 24 }}>{t('group_no_league')}</Text>
        ) : (
          <>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1, marginTop: 20 }}>
              {t('group_pick_friends')} ({selectedFriendIds.length}/{MAX_FRIENDS})
            </Text>
            <ScrollView style={{ marginTop: 8, maxHeight: 260 }}>
              {friends.map((f) => {
                const checked = selectedFriendIds.includes(f.id);
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => toggleFriend(f.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: checked ? accent.mint : colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, marginBottom: 6 }}
                  >
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink, flex: 1 }}>{f.display_name}</Text>
                    <Text style={{ fontFamily: fonts.display, fontSize: 13 }}>{checked ? '✓' : ''}</Text>
                  </Pressable>
                );
              })}
              {!friends.length && friendsLoading && <ActivityIndicator color={colors.ink} style={{ marginTop: 10 }} />}
            </ScrollView>

            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1, marginTop: 16 }}>{t('group_pick_duration')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setRoundSeconds(d)}
                  style={{ flex: 1, paddingVertical: 12, backgroundColor: roundSeconds === d ? accent.coral : colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: fonts.display, fontSize: 13, color: roundSeconds === d ? '#fff' : colors.ink }}>{d}s</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleCreate}
              disabled={!selectedFriendIds.length || busy}
              style={{ marginTop: 20, paddingVertical: 14, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 14, alignItems: 'center', opacity: selectedFriendIds.length ? 1 : 0.5 }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>{t('group_create_button')}</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  // Invited, haven't responded yet.
  if (game.status === 'lobby' && myRow?.status === 'invited') {
    const creatorRow = players.find((p) => p.user_id === game.creator_id);
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 40 }}>👥</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink, textAlign: 'center' }}>
          {(creatorRow?.display_name || '') + ' ' + t('group_invite_title')}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>{game.round_seconds}s · {t('group_invite_sub')}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Pressable onPress={() => respondInvite(false)} style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{t('duel_invite_decline')}</Text>
          </Pressable>
          <Pressable onPress={() => respondInvite(true)} style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: accent.mint, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{t('duel_invite_accept')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Lobby: waiting room.
  if (game.status === 'lobby') {
    const joinedCount = players.filter((p) => p.status === 'joined').length;
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 60, paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>
          {t('group_lobby_title')} {joinedCount}/{players.length}
        </Text>
        <View style={{ marginTop: 16, gap: 8 }}>
          {players.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <Text style={{ fontSize: 16 }}>{p.status === 'joined' ? '✓' : p.status === 'declined' ? '✕' : '○'}</Text>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink, flex: 1 }}>{p.display_name}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>
                {p.status === 'joined' ? t('group_status_joined') : p.status === 'declined' ? t('group_status_declined') : t('group_status_waiting')}
              </Text>
            </View>
          ))}
        </View>

        {isCreator && (
          <>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1, marginTop: 20 }}>{t('group_pick_level')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {(Object.keys(LEVEL_META) as Level[]).map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setLevel(l)}
                  style={{ flex: 1, paddingVertical: 12, backgroundColor: level === l ? accent.coral : colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: fonts.display, fontSize: 12, color: level === l ? '#fff' : colors.ink }}>{LEVEL_META[l].icon} {t(LEVEL_META[l].labelKey)}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={handleStart}
              disabled={joinedCount < 2 || busy}
              style={{ marginTop: 20, paddingVertical: 14, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 14, alignItems: 'center', opacity: joinedCount < 2 ? 0.5 : 1 }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {t('group_start_button')} {joinedCount}
              </Text>
            </Pressable>
          </>
        )}

        <Pressable onPress={() => cancelLobby()} style={{ marginTop: 12, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted }}>{t('group_cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  // Never responded to the invite before the creator started without us —
  // no seat to play from, so just let them back out rather than falling
  // into the active/results branches below as if we were racing too.
  if (game.status !== 'lobby' && myRow?.status !== 'joined') {
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ fontSize: 40 }}>👥</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink, textAlign: 'center' }}>{t('group_missed_title')}</Text>
        <Pressable onPress={() => leaveFinished()} style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('group_leave')}</Text>
        </Pressable>
      </View>
    );
  }

  // Active round.
  if (game.status === 'active') {
    if (!mysteryPlayer) {
      return withBack(
        <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      );
    }
    const others = players.filter((p) => p.status === 'joined' && p.user_id !== user?.id);
    if (solved) {
      return withBack(
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Text style={{ fontSize: 40 }}>✅</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>{t('group_solved_wait')}</Text>
          <View style={{ paddingVertical: 6, paddingHorizontal: 14, backgroundColor: colors.track, borderRadius: 999 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.muted }}>⏱ {secondsLeft}s</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {others.map((p) => (
              <View key={p.id} style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 999 }}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink }}>{p.solved ? '✅' : '⏳'} {p.display_name}</Text>
              </View>
            ))}
          </View>
        </View>
        , { hideBack: true }
      );
    }
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: secondsLeft <= 10 ? accent.wrongRed : colors.track, borderRadius: 999 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: secondsLeft <= 10 ? '#fff' : colors.muted }}>⏱ {secondsLeft}s</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
          {others.map((p) => (
            <View key={p.id} style={{ paddingVertical: 3, paddingHorizontal: 8, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.ink }}>{p.solved ? '✅' : '⏳'} {p.display_name}</Text>
            </View>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, gap: 5 }}>
          {mysteryPlayer.clubs.map((c, i) => {
            const rev = i < revealed;
            if (rev) {
              return (
                <RevealCard key={i}>
                  <HardShadowBox bg={colors.card} radius={12} offset={3} style={{ marginBottom: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6 }}>
                      <ClubShield name={c} size={36} />
                      <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink, flex: 1 }}>{c}</Text>
                    </View>
                  </HardShadowBox>
                </RevealCard>
              );
            }
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, backgroundColor: colors.track, borderWidth: 2, borderColor: 'rgba(0,0,0,.2)', borderStyle: 'dashed', borderRadius: 12, marginBottom: 5 }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.muted }}>?</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {wrongList.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 6, flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
            {wrongList.map((w, i) => (
              <View key={i} style={{ paddingVertical: 3, paddingHorizontal: 9, backgroundColor: accent.wrongRed, borderWidth: 1.5, borderColor: colors.border, borderRadius: 999 }}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 9, color: colors.ink }}>✕ {w}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(12, insets.bottom + 8) }}>
          <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14, color: guess ? colors.ink : colors.muted }}>
              {guess || t('game_input_placeholder')}
            </Text>
          </View>
          <View style={{ marginTop: 8, gap: 4 }}>
            {KEY_ROWS.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
                {ri === 2 && <View style={{ flex: 0.5 }} />}
                {row.split('').map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => setGuess(guess + l)}
                    style={{ flex: 1, height: 36, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{l}</Text>
                  </Pressable>
                ))}
                {ri === 2 && <View style={{ flex: 0.5 }} />}
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Pressable onPress={() => setGuess(guess.slice(0, -1))} style={{ flex: 1.4, height: 36, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('game_backspace')}</Text>
              </Pressable>
              <Pressable onPress={() => setGuess(guess + ' ')} style={{ flex: 3, height: 36, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('game_space')}</Text>
              </Pressable>
            </View>
          </View>
          <Pressable onPress={submitGuess} style={{ marginTop: 8, paddingVertical: 12, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>{t('game_send')}</Text>
          </Pressable>
        </View>
      </View>
      , { hideBack: true }
    );
  }

  // Finished: results.
  const ranked = players
    .filter((p) => p.status === 'joined')
    .slice()
    .sort((a, b) => {
      if (a.solved && b.solved) return (a.elapsed_ms || 0) - (b.elapsed_ms || 0);
      if (a.solved) return -1;
      if (b.solved) return 1;
      return b.attempts - a.attempts;
    });
  const medals = ['🥇', '🥈', '🥉'];

  return withBack(
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 60, paddingHorizontal: 20 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{t('group_results_title')}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 }}>
        {t('group_results_sub')} {game.mystery_player}
      </Text>
      {lastReward > 0 && (
        <View style={{ marginTop: 12, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: accent.mint, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>+{lastReward} 💎</Text>
        </View>
      )}
      <View style={{ marginTop: 16, gap: 8 }}>
        {ranked.map((p, i) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: p.user_id === user?.id ? accent.mint : colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            <Text style={{ fontSize: 16 }}>{p.solved && medals[i] ? medals[i] : p.solved ? '✅' : '—'}</Text>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink, flex: 1 }}>{p.display_name}</Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>
              {p.solved ? `${p.attempts} ${t('group_attempts_short')} · ${Math.round((p.elapsed_ms || 0) / 1000)}s` : t('group_not_found')}
            </Text>
          </View>
        ))}
      </View>
      <Pressable onPress={() => leaveFinished()} style={{ marginTop: 20, paddingVertical: 14, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 14, alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>{t('group_leave')}</Text>
      </Pressable>
    </View>
  );
}
