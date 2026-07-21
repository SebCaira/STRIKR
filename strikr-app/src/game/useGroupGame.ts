// Shared "race" infra for Groupe (up to 5 league friends) and Duel (1
// opponent) modes, across three games: "Devine le joueur" (main), "Devine
// le club" (club), and "Mode Liste" (liste). One creator sets up a lobby
// (round duration + invites), everyone else accepts/declines, then the
// creator picks the round's content (difficulty for main, a themed list for
// liste, nothing extra for club) and starts. Each client runs its own local
// guess loop against the shared target and reports its own result back —
// ranking and rewards are derived from those reports once the round ends.
//
// Grille keeps its own separate turn-based Duel (useDuel.ts) — this hook is
// for the "everyone plays at once, own screen, no waiting for a turn" style
// instead.
import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/auth';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { fx } from '../lib/fx';
import { PLAYERS, Player } from '../data/players';
import { GAME_REWARDED_WINS_PER_DAY, GAME_WIN_XP, Level, rewardFor, tierOf } from './engine';
import { CLUB_WIN_DIAMONDS_BASE, CLUB_WIN_XP, pickMysteryClub } from './useClubGuess';
import { QUIZ_REWARD_PER_PLAYER, QUIZ_WIN_XP } from './useQuizList';
import { QUIZ_LISTS } from '../data/quizLists';

export type GroupPlayerStatus = 'invited' | 'joined' | 'declined';
export type GroupGameStatus = 'lobby' | 'active' | 'finished';
export type GroupGameType = 'main' | 'club' | 'liste';

export interface GroupPlayerRow {
  id: string;
  game_id: string;
  user_id: string;
  display_name: string;
  status: GroupPlayerStatus;
  attempts: number;
  solved: boolean;
  elapsed_ms: number | null;
  found_count: number;
}

export interface GroupGameRow {
  id: string;
  creator_id: string;
  status: GroupGameStatus;
  game_type: GroupGameType;
  mystery_player: string | null;
  mystery_club: string | null;
  list_id: string | null;
  level: Level | null;
  round_seconds: number;
  created_at: string;
  started_at: string | null;
}

// Fastest-solver (or, for Mode Liste, most-found) bonus on top of the normal
// per-solver reward — one shared cap across all three games since it's a
// generic "you won the race" bonus, capped generously since a real lobby is
// naturally rate limited by having to round up friends.
const RACE_WIN_BONUS = 8;
const REWARDED_RACE_WINS_PER_DAY = 5;
const RACE_WIN_STORAGE_KEY = 'strikr_group_win_rewards_v1';

// Per-solve rewards for club/liste race modes get their own daily caps,
// separate from each game's solo-mode cap — same reasoning as Grille en
// duel getting its own cap distinct from Grille solo.
const CLUB_RACE_REWARDED_PER_DAY = 5;
const CLUB_RACE_STORAGE_KEY = 'strikr_club_race_rewards_v1';
const LISTE_RACE_REWARDED_PER_DAY = 5;
const LISTE_RACE_STORAGE_KEY = 'strikr_liste_race_rewards_v1';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function useDailyCounter(storageKey: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr()) setCount(parsed.count || 0);
      } catch {
        // ignore corrupt storage
      }
    });
  }, [storageKey]);
  const bump = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(storageKey, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
      return next;
    });
  }, [storageKey]);
  return [count, bump] as const;
}

export function useGroupGame() {
  const { user } = useAuth();
  const { addDiamonds } = useDiamonds();
  const { stats, recordWin } = useStats();
  const [game, setGame] = useState<GroupGameRow | null>(null);
  const [players, setPlayers] = useState<GroupPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const gameChannelRef = useRef<RealtimeChannel | null>(null);
  const rewardedGameRef = useRef<string | null>(null);
  const [lastReward, setLastReward] = useState(0);
  const [raceWinBonusToday, bumpRaceWinBonusToday] = useDailyCounter(RACE_WIN_STORAGE_KEY);
  const [clubRaceRewardedToday, bumpClubRaceRewardedToday] = useDailyCounter(CLUB_RACE_STORAGE_KEY);
  const [listeRaceRewardedToday, bumpListeRaceRewardedToday] = useDailyCounter(LISTE_RACE_STORAGE_KEY);

  const loadPlayers = useCallback(async (gameId: string) => {
    const { data } = await supabase.from('group_game_players').select('*').eq('game_id', gameId);
    setPlayers((data as GroupPlayerRow[]) || []);
  }, []);

  const loadActive = useCallback(async () => {
    if (!user) {
      setGame(null);
      setPlayers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: myRows } = await supabase
      .from('group_game_players')
      .select('game_id')
      .eq('user_id', user.id)
      .in('status', ['invited', 'joined']);
    const gameIds = (myRows || []).map((r: { game_id: string }) => r.game_id);
    if (!gameIds.length) {
      setGame(null);
      setPlayers([]);
      setLoading(false);
      return;
    }
    const { data: games } = await supabase
      .from('group_games')
      .select('*')
      .in('id', gameIds)
      .neq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(1);
    const g = ((games as GroupGameRow[] | null) || [])[0] || null;
    setGame(g);
    if (g) await loadPlayers(g.id);
    else setPlayers([]);
    setLoading(false);
  }, [user, loadPlayers]);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  // Catches a fresh invite landing while already sitting on the Jeux tab.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`group-invites-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_game_players', filter: `user_id=eq.${user.id}` },
        () => loadActive()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadActive]);

  useEffect(() => {
    if (gameChannelRef.current) {
      supabase.removeChannel(gameChannelRef.current);
      gameChannelRef.current = null;
    }
    if (!game) return;
    const channel = supabase
      .channel(`group-game-${game.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_games', filter: `id=eq.${game.id}` },
        (payload) => setGame(payload.new as GroupGameRow)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_game_players', filter: `game_id=eq.${game.id}` },
        () => loadPlayers(game.id)
      )
      .subscribe();
    gameChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      gameChannelRef.current = null;
    };
  }, [game?.id, loadPlayers]);

  // Fires once per finished game (guarded by rewardedGameRef), from whichever
  // client's local timer flips the shared status to 'finished' first — every
  // other joined participant's own client lands here via realtime and
  // credits itself independently, same pattern as useDuel's win effect.
  useEffect(() => {
    if (!game || !user || game.status !== 'finished' || !players.length) return;
    if (rewardedGameRef.current === game.id) return;
    const me = players.find((p) => p.user_id === user.id);
    if (!me || me.status !== 'joined') return;
    rewardedGameRef.current = game.id;

    let reward = 0;
    const joined = players.filter((p) => p.status === 'joined');

    if (game.game_type === 'main') {
      if (me.solved && game.level) {
        const capped = stats.gameWinsToday >= GAME_REWARDED_WINS_PER_DAY;
        const solveReward = capped ? 0 : rewardFor(game.level, me.attempts);
        if (solveReward > 0) {
          addDiamonds(solveReward);
          recordWin({ kind: 'game', firstTry: me.attempts === 1, xp: GAME_WIN_XP });
          reward += solveReward;
        }
      }
    } else if (game.game_type === 'club') {
      if (me.solved) {
        const capped = clubRaceRewardedToday >= CLUB_RACE_REWARDED_PER_DAY;
        const solveReward = capped ? 0 : Math.max(2, CLUB_WIN_DIAMONDS_BASE - (me.attempts - 1));
        if (solveReward > 0) {
          addDiamonds(solveReward);
          recordWin({ kind: 'club_guess', firstTry: me.attempts === 1, xp: CLUB_WIN_XP });
          bumpClubRaceRewardedToday();
          reward += solveReward;
        }
      }
    } else if (game.game_type === 'liste') {
      if (me.found_count > 0) {
        const capped = listeRaceRewardedToday >= LISTE_RACE_REWARDED_PER_DAY;
        const solveReward = capped ? 0 : me.found_count * QUIZ_REWARD_PER_PLAYER;
        if (solveReward > 0) {
          addDiamonds(solveReward);
          recordWin({ kind: 'game', firstTry: false, xp: QUIZ_WIN_XP });
          bumpListeRaceRewardedToday();
          reward += solveReward;
        }
      }
    }

    let winner: GroupPlayerRow | null = null;
    if (game.game_type === 'liste') {
      winner = joined.reduce<GroupPlayerRow | null>(
        (best, p) => (p.found_count > 0 && (!best || p.found_count > best.found_count) ? p : best),
        null
      );
    } else {
      const solvedJoined = joined.filter((p) => p.solved && p.elapsed_ms != null);
      winner = solvedJoined.reduce<GroupPlayerRow | null>(
        (best, p) => (!best || p.elapsed_ms! < best.elapsed_ms! ? p : best),
        null
      );
    }
    if (winner && winner.user_id === user.id && raceWinBonusToday < REWARDED_RACE_WINS_PER_DAY) {
      addDiamonds(RACE_WIN_BONUS);
      reward += RACE_WIN_BONUS;
      bumpRaceWinBonusToday();
    }

    setLastReward(reward);
    if (reward > 0) fx.win();
  }, [
    game,
    players,
    user,
    stats.gameWinsToday,
    raceWinBonusToday,
    clubRaceRewardedToday,
    listeRaceRewardedToday,
    addDiamonds,
    recordWin,
    bumpRaceWinBonusToday,
    bumpClubRaceRewardedToday,
    bumpListeRaceRewardedToday,
  ]);

  const createGroup = useCallback(
    async (
      targetUserIds: string[],
      targetNames: string[],
      roundSeconds: number,
      gameType: GroupGameType = 'main'
    ): Promise<{ error: string | null }> => {
      if (!user) return { error: 'not_authenticated' };
      const { error } = await supabase.rpc('create_group_game', {
        target_user_ids: targetUserIds,
        target_names: targetNames,
        round_seconds_arg: roundSeconds,
        game_type_arg: gameType,
      });
      if (error) return { error: error.message };
      await loadActive();
      return { error: null };
    },
    [user, loadActive]
  );

  const respondInvite = useCallback(
    async (accept: boolean): Promise<{ error: string | null }> => {
      if (!game || !user) return { error: 'no_game' };
      const { error } = await supabase
        .from('group_game_players')
        .update({ status: accept ? 'joined' : 'declined', joined_at: accept ? new Date().toISOString() : null })
        .eq('game_id', game.id)
        .eq('user_id', user.id);
      if (error) return { error: error.message };
      if (accept) await loadActive();
      else setGame(null);
      return { error: null };
    },
    [game, user, loadActive]
  );

  // Leaving a lobby that never gets going — any joined member can do it, not
  // just the creator, so nobody's stuck waiting on a lobby its creator
  // abandoned.
  const cancelLobby = useCallback(async (): Promise<void> => {
    if (!game) return;
    await supabase.from('group_games').update({ status: 'finished' }).eq('id', game.id).eq('status', 'lobby');
    setGame(null);
  }, [game]);

  // Content picked here varies by game_type: a difficulty for "main", a
  // themed list for "liste" (no separate difficulty — the list carries its
  // own), nothing extra for "club" (mystery club is just picked at random).
  const startRound = useCallback(
    async (config?: { level?: Level; listId?: string }): Promise<{ error: string | null }> => {
      if (!game) return { error: 'no_game' };
      const update: Record<string, unknown> = { status: 'active', started_at: new Date().toISOString() };
      if (game.game_type === 'main') {
        if (!config?.level) return { error: 'missing_level' };
        const pool = PLAYERS.filter((p) => tierOf(p.n) === config.level);
        const mystery = pool[Math.floor(Math.random() * pool.length)];
        update.mystery_player = mystery.n;
        update.level = config.level;
      } else if (game.game_type === 'club') {
        update.mystery_club = pickMysteryClub();
      } else if (game.game_type === 'liste') {
        if (!config?.listId) return { error: 'missing_list' };
        update.list_id = config.listId;
      }
      const { error } = await supabase.from('group_games').update(update).eq('id', game.id).eq('status', 'lobby');
      if (error) return { error: error.message };
      return { error: null };
    },
    [game]
  );

  const submitResult = useCallback(
    async (result: { attempts?: number; elapsedMs?: number | null; solved?: boolean; foundCount?: number }): Promise<void> => {
      if (!game || !user) return;
      await supabase
        .from('group_game_players')
        .update({
          attempts: result.attempts ?? 0,
          solved: result.solved ?? false,
          elapsed_ms: result.elapsedMs ?? null,
          found_count: result.foundCount ?? 0,
        })
        .eq('game_id', game.id)
        .eq('user_id', user.id);
    },
    [game, user]
  );

  // Whichever client's local round countdown hits zero first flips the
  // shared row — guarded by .eq('status','active') so a second, slightly
  // later timer firing on another client is a harmless no-op.
  const finishGame = useCallback(async (): Promise<void> => {
    if (!game) return;
    await supabase.from('group_games').update({ status: 'finished' }).eq('id', game.id).eq('status', 'active');
  }, [game]);

  const leaveFinished = useCallback(() => setGame(null), []);

  const mysteryPlayer: Player | null = game?.mystery_player ? PLAYERS.find((p) => p.n === game.mystery_player) || null : null;
  const mysteryList = game?.list_id ? QUIZ_LISTS.find((l) => l.id === game.list_id) || null : null;

  return {
    game,
    players,
    loading,
    mysteryPlayer,
    mysteryClub: game?.mystery_club || null,
    mysteryList,
    isCreator: !!(game && user && game.creator_id === user.id),
    createGroup,
    respondInvite,
    cancelLobby,
    startRound,
    submitResult,
    finishGame,
    leaveFinished,
    refresh: loadActive,
    lastReward,
  };
}
