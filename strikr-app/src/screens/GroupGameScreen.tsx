// Shared screen for Groupe (up to 4 invites) and Duel (1 invite) race modes,
// across "Devine le joueur" (main), "Devine le club" (club), "Mode Liste"
// (liste), and "Grille" (grille) — see useGroupGame for the lobby/sync/
// reward model this sits on top of. Grille also keeps its separate
// turn-based 1v1 DuelScreen, unrelated to this one.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useAuth } from '../state/auth';
import { useAllLeagueFriends } from '../state/leagues';
import { GroupGameType, useGroupGame } from '../game/useGroupGame';
import { PLAYERS } from '../data/players';
import { Level, clubColor, clubInit, matchesGuess, stripAcc } from '../game/engine';
import { MAX_GUESSES, ClubGuessRow, compareClubGuess, resolveClubGuess } from '../game/useClubGuess';
import { matchesCriteria } from '../game/gridDuel';
import { CLUB_DATA } from '../data/clubData';
import { QUIZ_LISTS, QuizDifficulty, playerFull, playerBase } from '../data/quizLists';
import { flagEmoji } from '../lib/flags';
import { getClubLogo } from '../lib/wikiLookup';
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
const CREST_SIZE = 96;

interface GroupGameScreenProps {
  onBack?: () => void;
  gameType: GroupGameType;
  variant: 'duel' | 'group';
}

function Crest({ name, revealFraction }: { name: string; revealFraction: number }) {
  const { colors, fonts } = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    getClubLogo(name).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);
  if (!url) {
    return (
      <View style={{ width: CREST_SIZE, height: CREST_SIZE, borderRadius: 18, backgroundColor: clubColor(name), alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 30, color: '#fff' }}>{clubInit(name)}</Text>
      </View>
    );
  }
  const revealedWidth = Math.max(14, CREST_SIZE * revealFraction);
  return (
    <View style={{ width: CREST_SIZE, height: CREST_SIZE, borderRadius: 18, backgroundColor: colors.card, borderWidth: 2.5, borderColor: colors.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: revealedWidth, height: CREST_SIZE, overflow: 'hidden' }}>
        <Image source={{ uri: url }} style={{ width: CREST_SIZE, height: CREST_SIZE, transform: [{ scaleX: revealFraction >= 1 ? 1 : -1 }] }} resizeMode="contain" />
      </View>
    </View>
  );
}

function Chip({ icon, value, match, label }: { icon: string; value: string; match: boolean | null; label: string }) {
  const { colors, accent, fonts } = useTheme();
  const bg = match === true ? accent.mint : colors.card;
  return (
    <View style={{ alignItems: 'center', gap: 2, flex: 1 }}>
      <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: bg, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13 }}>{icon}</Text>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 8, color: colors.ink }} numberOfLines={1}>{value}</Text>
      </View>
      <Text style={{ fontFamily: fonts.mono, fontSize: 7, color: colors.muted, letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function ClubGuessChips({ row }: { row: ClubGuessRow }) {
  const { t } = useI18n();
  const { fonts, colors } = useTheme();
  const compareIcon = (c: 'match' | 'up' | 'down') => (c === 'match' ? '✓' : c === 'up' ? '↑' : '↓');
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink, marginBottom: 4, textAlign: 'center' }}>{row.name}</Text>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <Chip icon={flagEmoji(row.nat)} value={row.nat} match={row.natMatch} label={t('club_chip_nat')} />
        <Chip icon={compareIcon(row.foundedCompare)} value={String(row.founded)} match={row.foundedCompare === 'match'} label={t('club_chip_est')} />
        <Chip icon={compareIcon(row.capacityCompare)} value={`${Math.round(row.capacity / 1000)}k`} match={row.capacityCompare === 'match'} label={t('club_chip_cap')} />
        <Chip icon={row.direction} value="" match={null} label={t('club_chip_dir')} />
        <Chip icon="📍" value={`${row.distanceKm}`} match={row.distanceKm === 0} label={t('club_chip_dist')} />
      </View>
    </View>
  );
}

export default function GroupGameScreen({ onBack, gameType, variant }: GroupGameScreenProps) {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const rules = useRulesModal(variant === 'duel' ? `duel_${gameType}` : 'group');
  const { user } = useAuth();
  const { friends, hasLeague, loading: friendsLoading } = useAllLeagueFriends();
  const {
    game,
    players,
    loading,
    mysteryPlayer,
    mysteryClub,
    mysteryList,
    grid,
    isCreator,
    createGroup,
    respondInvite,
    cancelLobby,
    startRound,
    submitResult,
    finishGame,
    leaveFinished,
    lastReward,
  } = useGroupGame();

  const maxFriends = variant === 'duel' ? 1 : 4;
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [roundSeconds, setRoundSeconds] = useState(90);
  const [level, setLevel] = useState<Level>('medium');
  const [listDifficulty, setListDifficulty] = useState<QuizDifficulty>('easy');
  const [busy, setBusy] = useState(false);

  // Local per-round play state — only reported back via submitResult() at
  // solve or timeout, so other players never see live guesses, just the
  // eventual result. Only the fields relevant to `gameType` get used.
  const [answer, setAnswer] = useState('');
  const [wrongList, setWrongList] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [clubGuesses, setClubGuesses] = useState<ClubGuessRow[]>([]);
  const [foundIndexes, setFoundIndexes] = useState<number[]>([]);
  const [grilleCells, setGrilleCells] = useState<(string | null)[]>(Array(9).fill(null));
  const [grilleUsedPlayers, setGrilleUsedPlayers] = useState<string[]>([]);
  const [grilleSelectedCell, setGrilleSelectedCell] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  // Distinct from `solved`: club can run out of its 6 guesses without ever
  // finding the mystery club — that player is done playing too (same
  // "waiting for the round to end" screen), but it isn't a win, so it needs
  // its own flag rather than overloading `solved` and showing "Found it!".
  const [outOfAttempts, setOutOfAttempts] = useState(false);
  const [now, setNow] = useState(Date.now());
  const handledRoundRef = useRef<string | null>(null);

  const myRow = game ? players.find((p) => p.user_id === user?.id) : undefined;

  useEffect(() => {
    if (game && game.status === 'active' && handledRoundRef.current !== game.id) {
      setAnswer('');
      setWrongList([]);
      setClubGuesses([]);
      setFoundIndexes([]);
      setGrilleCells(Array(9).fill(null));
      setGrilleUsedPlayers([]);
      setGrilleSelectedCell(null);
      setError(null);
      setSolved(false);
      setOutOfAttempts(false);
      if (gameType === 'main' && mysteryPlayer) setRevealed(Math.max(1, Math.min(3, mysteryPlayer.clubs.length - 2)));
    }
  }, [game?.id, game?.status, mysteryPlayer, gameType]);

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
    if (!solved && !outOfAttempts) {
      if (gameType === 'liste') submitResult({ foundCount: foundIndexes.length, solved: false });
      else if (gameType === 'grille') submitResult({ foundCount: grilleCells.filter((c) => c).length, solved: false });
      else submitResult({ attempts: gameType === 'club' ? clubGuesses.length : wrongList.length, elapsedMs: null, solved: false });
    }
    finishGame();
  }, [
    secondsLeft,
    game?.id,
    game?.status,
    solved,
    outOfAttempts,
    gameType,
    wrongList.length,
    clubGuesses.length,
    foundIndexes.length,
    grilleCells,
    submitResult,
    finishGame,
  ]);

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (maxFriends === 1) return [id];
      return prev.length < maxFriends ? [...prev, id] : prev;
    });
  };

  const handleCreate = async () => {
    if (!selectedFriendIds.length || busy) return;
    setBusy(true);
    const names = selectedFriendIds.map((id) => friends.find((f) => f.id === id)?.display_name || '');
    await createGroup(selectedFriendIds, names, roundSeconds, gameType);
    setBusy(false);
  };

  const handleStartMain = async () => {
    if (busy) return;
    setBusy(true);
    await startRound({ level });
    setBusy(false);
  };
  const handleStartClub = async () => {
    if (busy) return;
    setBusy(true);
    await startRound();
    setBusy(false);
  };
  const handleStartListe = async (listId: string) => {
    if (busy) return;
    setBusy(true);
    await startRound({ listId });
    setBusy(false);
  };
  const handleStartGrille = async () => {
    if (busy) return;
    setBusy(true);
    await startRound();
    setBusy(false);
  };

  const submitMainGuess = () => {
    if (!mysteryPlayer || solved || !game || game.status !== 'active' || !answer.trim()) return;
    if (matchesGuess(mysteryPlayer, answer)) {
      const attempt = wrongList.length + 1;
      const elapsed = game.started_at ? Date.now() - new Date(game.started_at).getTime() : null;
      setSolved(true);
      setRevealed(mysteryPlayer.clubs.length);
      setAnswer('');
      submitResult({ attempts: attempt, elapsedMs: elapsed, solved: true });
    } else {
      setWrongList((prev) => [...prev, answer.trim()]);
      setRevealed((prev) => Math.min(prev + 1, mysteryPlayer.clubs.length));
      setAnswer('');
    }
  };

  const submitClubGuess = () => {
    if (!mysteryClub || solved || outOfAttempts || !game || game.status !== 'active' || !answer.trim()) return;
    const name = resolveClubGuess(answer);
    if (!name) {
      setError(t('club_error_unknown'));
      return;
    }
    if (clubGuesses.some((g) => g.name === name)) {
      setError(t('club_error_used'));
      return;
    }
    const row = compareClubGuess(name, mysteryClub);
    if (!row) {
      setError(t('club_error_unknown'));
      return;
    }
    const nextGuesses = [row, ...clubGuesses];
    setClubGuesses(nextGuesses);
    setAnswer('');
    setError(null);
    const won = name === mysteryClub;
    if (won) {
      const elapsed = game.started_at ? Date.now() - new Date(game.started_at).getTime() : null;
      setSolved(true);
      submitResult({ attempts: nextGuesses.length, elapsedMs: elapsed, solved: true });
    } else if (nextGuesses.length >= MAX_GUESSES) {
      setOutOfAttempts(true);
      submitResult({ attempts: nextGuesses.length, elapsedMs: null, solved: false });
    }
  };

  const submitListeGuess = () => {
    if (!mysteryList || solved || !game || game.status !== 'active' || !answer.trim()) return;
    const input = stripAcc(answer.trim().toLowerCase());
    const baseCounts = new Map<string, number>();
    mysteryList.players.forEach((p) => {
      const b = stripAcc(playerBase(p).toLowerCase());
      baseCounts.set(b, (baseCounts.get(b) || 0) + 1);
    });
    const idx = mysteryList.players.findIndex((p, i) => {
      if (foundIndexes.includes(i)) return false;
      const full = stripAcc(playerFull(p).toLowerCase());
      const base = stripAcc(playerBase(p).toLowerCase());
      if (input === full) return true;
      if (input === base && (baseCounts.get(base) || 0) === 1) return true;
      return false;
    });
    if (idx === -1) {
      setError(t('club_error_unknown'));
      return;
    }
    const nextFound = [...foundIndexes, idx];
    setFoundIndexes(nextFound);
    setAnswer('');
    setError(null);
    if (nextFound.length === mysteryList.players.length) {
      setSolved(true);
      submitResult({ foundCount: nextFound.length, solved: true });
    }
  };

  // Grille uses a tap-a-cell-then-type modal (like SoloGridScreen) rather
  // than the single shared answer bar the other three games use, so it gets
  // its own submit function called from that modal instead of submitGuess().
  const submitGrilleCell = () => {
    if (!grid || grilleSelectedCell === null || !game || game.status !== 'active' || !answer.trim()) return;
    const ri = Math.floor(grilleSelectedCell / 3);
    const ci = grilleSelectedCell % 3;
    const rowC = grid.rows[ri];
    const colC = grid.cols[ci];
    const found = matchesCriteria(answer, rowC, colC);
    if (!found) {
      setError(t('duel_error_invalid'));
      return;
    }
    if (grilleUsedPlayers.includes(found.n)) {
      setError(t('duel_error_used'));
      return;
    }
    const nextCells = grilleCells.slice();
    nextCells[grilleSelectedCell] = found.n;
    setGrilleCells(nextCells);
    setGrilleUsedPlayers((prev) => [...prev, found.n]);
    setGrilleSelectedCell(null);
    setAnswer('');
    setError(null);
    const filled = nextCells.filter((c) => c).length;
    if (filled === 9) {
      const elapsed = game.started_at ? Date.now() - new Date(game.started_at).getTime() : null;
      setSolved(true);
      submitResult({ foundCount: 9, elapsedMs: elapsed, solved: true });
    }
  };

  const submitGuess = () => {
    if (gameType === 'main') submitMainGuess();
    else if (gameType === 'club') submitClubGuess();
    else submitListeGuess();
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
              {t('group_pick_friends')} ({selectedFriendIds.length}/{maxFriends})
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
    const listsForDifficulty = QUIZ_LISTS.filter((l) => l.difficulty === listDifficulty);
    return withBack(
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 60, paddingHorizontal: 20 }}>
        <ScrollView>
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

          {isCreator && gameType === 'main' && (
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
                onPress={handleStartMain}
                disabled={joinedCount < 2 || busy}
                style={{ marginTop: 20, paddingVertical: 14, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 14, alignItems: 'center', opacity: joinedCount < 2 ? 0.5 : 1 }}
              >
                <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {t('group_start_button')} {joinedCount}
                </Text>
              </Pressable>
            </>
          )}

          {isCreator && gameType === 'club' && (
            <Pressable
              onPress={handleStartClub}
              disabled={joinedCount < 2 || busy}
              style={{ marginTop: 20, paddingVertical: 14, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 14, alignItems: 'center', opacity: joinedCount < 2 ? 0.5 : 1 }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {t('group_start_button')} {joinedCount}
              </Text>
            </Pressable>
          )}

          {isCreator && gameType === 'liste' && (
            <>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6 }}>{t('quiz_choose_difficulty')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setListDifficulty(d)}
                    style={{ flex: 1, paddingVertical: 12, backgroundColor: listDifficulty === d ? accent.coral : colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: fonts.display, fontSize: 12, color: listDifficulty === d ? '#fff' : colors.ink }}>{t(`quiz_difficulty_${d}`)}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ marginTop: 10, gap: 8 }}>
                {listsForDifficulty.map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() => handleStartListe(l.id)}
                    disabled={joinedCount < 2 || busy}
                    style={{ paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, opacity: joinedCount < 2 ? 0.5 : 1 }}
                  >
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{l.title}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {isCreator && gameType === 'grille' && (
            <Pressable
              onPress={handleStartGrille}
              disabled={joinedCount < 2 || busy}
              style={{ marginTop: 20, paddingVertical: 14, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 14, alignItems: 'center', opacity: joinedCount < 2 ? 0.5 : 1 }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {t('group_start_button')} {joinedCount}
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <Pressable onPress={() => cancelLobby()} style={{ paddingVertical: 12, alignItems: 'center' }}>
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
    const contentReady =
      gameType === 'main' ? !!mysteryPlayer : gameType === 'club' ? !!mysteryClub : gameType === 'grille' ? !!grid : !!mysteryList;
    if (!contentReady) {
      return withBack(
        <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      );
    }
    const others = players.filter((p) => p.status === 'joined' && p.user_id !== user?.id);

    if (solved || outOfAttempts) {
      return withBack(
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Text style={{ fontSize: 40 }}>{solved ? '✅' : '😔'}</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>{solved ? t('group_solved_wait') : t('group_out_of_attempts_wait')}</Text>
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
        </View>,
        { hideBack: true }
      );
    }

    const timerBar = (
      <>
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
      </>
    );

    const keyboard = (
      <View style={{ marginTop: 8, gap: 4 }}>
        {KEY_ROWS.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
            {ri === 2 && <View style={{ flex: 0.5 }} />}
            {row.split('').map((l) => (
              <Pressable
                key={l}
                onPress={() => setAnswer(answer + l)}
                style={{ flex: 1, height: 36, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{l}</Text>
              </Pressable>
            ))}
            {ri === 2 && <View style={{ flex: 0.5 }} />}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Pressable onPress={() => setAnswer(answer.slice(0, -1))} style={{ flex: 1.4, height: 36, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('game_backspace')}</Text>
          </Pressable>
          <Pressable onPress={() => setAnswer(answer + ' ')} style={{ flex: 3, height: 36, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('game_space')}</Text>
          </Pressable>
        </View>
      </View>
    );

    if (gameType === 'main' && mysteryPlayer) {
      return withBack(
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
          {timerBar}
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
              <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14, color: answer ? colors.ink : colors.muted }}>{answer || t('game_input_placeholder')}</Text>
            </View>
            {keyboard}
            <Pressable onPress={submitGuess} style={{ marginTop: 8, paddingVertical: 12, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>{t('game_send')}</Text>
            </Pressable>
          </View>
        </View>,
        { hideBack: true }
      );
    }

    if (gameType === 'club' && mysteryClub) {
      const revealFraction = 0.15 + 0.85 * (clubGuesses.length / MAX_GUESSES);
      const clubNames = Object.keys(CLUB_DATA);
      const suggestions =
        answer.trim().length >= 2
          ? clubNames.filter((n) => stripAcc(n.toLowerCase()).includes(stripAcc(answer.trim().toLowerCase()))).slice(0, 5)
          : [];
      return withBack(
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
          {timerBar}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Crest name={mysteryClub} revealFraction={revealFraction} />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            {clubGuesses.map((g) => (
              <ClubGuessChips key={g.name} row={g} />
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(12, insets.bottom + 8) }}>
            <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14, color: answer ? colors.ink : colors.muted }}>{answer || t('club_answer_placeholder')}</Text>
            </View>
            {suggestions.length > 0 && (
              <View style={{ marginTop: 6, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
                {suggestions.map((s) => (
                  <Pressable key={s} onPress={() => setAnswer(s)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.06)' }}>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {error && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: accent.coral, marginTop: 6 }}>{error}</Text>}
            {keyboard}
            <Pressable onPress={submitGuess} style={{ marginTop: 8, paddingVertical: 12, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>{t('game_send')}</Text>
            </Pressable>
          </View>
        </View>,
        { hideBack: true }
      );
    }

    if (gameType === 'liste' && mysteryList) {
      return withBack(
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
          {timerBar}
          <Text style={{ textAlign: 'center', fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink, marginTop: 8 }}>
            {mysteryList.title} · {foundIndexes.length}/{mysteryList.players.length}
          </Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {mysteryList.players.map((p, i) => {
              const found = foundIndexes.includes(i);
              return (
                <View
                  key={i}
                  style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: found ? accent.mint : colors.track, borderWidth: 1.5, borderColor: colors.border }}
                >
                  <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink }}>{found ? playerFull(p) : '?'}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(12, insets.bottom + 8) }}>
            <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14, color: answer ? colors.ink : colors.muted }}>{answer || t('game_input_placeholder')}</Text>
            </View>
            {error && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: accent.coral, marginTop: 6 }}>{error}</Text>}
            {keyboard}
            <Pressable onPress={submitGuess} style={{ marginTop: 8, paddingVertical: 12, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>{t('game_send')}</Text>
            </Pressable>
          </View>
        </View>,
        { hideBack: true }
      );
    }

    if (gameType === 'grille' && grid) {
      const filledCount = grilleCells.filter((c) => c).length;
      const cellSuggestions =
        answer.trim().length >= 2
          ? PLAYERS.filter((p) => stripAcc(p.n.toLowerCase()).includes(stripAcc(answer.trim().toLowerCase()))).slice(0, 5)
          : [];
      return withBack(
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
          {timerBar}
          <Text style={{ textAlign: 'center', fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink, marginTop: 8 }}>
            {filledCount}/9
          </Text>
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 70 }} />
              {grid.cols.map((c, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 6, gap: 3 }}>
                  {c.type === 'nat' && <Text style={{ fontSize: 24 }}>{flagEmoji(c.value)}</Text>}
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 9, color: colors.ink, textAlign: 'center' }}>{c.label}</Text>
                </View>
              ))}
            </View>
            {grid.rows.map((r, ri) => (
              <View key={ri} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ width: 70, paddingRight: 6, alignItems: 'center', gap: 3 }}>
                  {r.type === 'club' && <ClubShield name={r.value} size={30} />}
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 9, color: colors.ink, textAlign: 'center' }} numberOfLines={2}>{r.label}</Text>
                </View>
                {grid.cols.map((_, ci) => {
                  const index = ri * 3 + ci;
                  const cellName = grilleCells[index];
                  return (
                    <Pressable
                      key={ci}
                      onPress={() => {
                        if (cellName) return;
                        setGrilleSelectedCell(index);
                        setAnswer('');
                        setError(null);
                      }}
                      style={{ flex: 1, aspectRatio: 1, marginHorizontal: 3, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: cellName ? accent.mint : colors.card, padding: 4 }}
                    >
                      {cellName ? (
                        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 9, color: '#1a1a1a', textAlign: 'center' }} numberOfLines={2}>{cellName}</Text>
                      ) : (
                        <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>+</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <Modal visible={grilleSelectedCell !== null} transparent animationType="fade" onRequestClose={() => setGrilleSelectedCell(null)}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }} onPress={() => setGrilleSelectedCell(null)}>
              <Pressable style={{ backgroundColor: colors.bg, borderTopWidth: 2.5, borderColor: colors.border, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Math.max(20, insets.bottom + 12) }}>
                <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14, color: answer ? colors.ink : colors.muted }}>
                    {answer || t('duel_answer_placeholder')}
                  </Text>
                </View>
                {cellSuggestions.length > 0 && (
                  <View style={{ marginTop: 6, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
                    {cellSuggestions.map((s) => (
                      <Pressable key={s.n} onPress={() => setAnswer(s.n)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.06)' }}>
                        <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{s.n}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {error && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: accent.coral, marginTop: 8 }}>{error}</Text>}
                {keyboard}
                <Pressable onPress={submitGrilleCell} style={{ marginTop: 12, paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('duel_validate')}</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </View>,
        { hideBack: true }
      );
    }
  }

  // Finished: results.
  const ranked = players
    .filter((p) => p.status === 'joined')
    .slice()
    .sort((a, b) => {
      if (gameType === 'liste') return b.found_count - a.found_count;
      if (a.solved && b.solved) return (a.elapsed_ms || 0) - (b.elapsed_ms || 0);
      if (a.solved) return -1;
      if (b.solved) return 1;
      if (gameType === 'grille') return b.found_count - a.found_count;
      return b.attempts - a.attempts;
    });
  const medals = ['🥇', '🥈', '🥉'];
  const revealLabel = gameType === 'main' ? game.mystery_player : gameType === 'club' ? game.mystery_club : null;

  return withBack(
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 60, paddingHorizontal: 20 }}>
      <ScrollView>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{t('group_results_title')}</Text>
        {revealLabel && (
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {t('group_results_sub')} {revealLabel}
          </Text>
        )}
        {lastReward > 0 && (
          <View style={{ marginTop: 12, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: accent.mint, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>+{lastReward} 💎</Text>
          </View>
        )}
        <View style={{ marginTop: 16, gap: 8 }}>
          {ranked.map((p, i) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: p.user_id === user?.id ? accent.mint : colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <Text style={{ fontSize: 16 }}>
                {gameType === 'liste'
                  ? p.found_count > 0 && medals[i]
                    ? medals[i]
                    : p.found_count > 0
                    ? '✅'
                    : '—'
                  : p.solved && medals[i]
                  ? medals[i]
                  : p.solved
                  ? '✅'
                  : '—'}
              </Text>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink, flex: 1 }}>{p.display_name}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>
                {gameType === 'liste'
                  ? `${p.found_count} ${t('group_found_short')}`
                  : gameType === 'grille'
                  ? p.solved
                    ? `${Math.round((p.elapsed_ms || 0) / 1000)}s`
                    : `${p.found_count}/9`
                  : p.solved
                  ? `${p.attempts} ${t('group_attempts_short')} · ${Math.round((p.elapsed_ms || 0) / 1000)}s`
                  : t('group_not_found')}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <Pressable onPress={() => leaveFinished()} style={{ marginVertical: 12, paddingVertical: 14, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 14, alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>{t('group_leave')}</Text>
      </Pressable>
    </View>
  );
}
