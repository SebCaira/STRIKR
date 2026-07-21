// "Groupe" mode for the main "Devine le joueur" game: up to 5 league friends
// race on the same mystery player at the same time. One creator sets up a
// lobby (round duration + invites), everyone else accepts/declines, then the
// creator picks a difficulty and starts the round. Each client runs its own
// local guess/reveal loop against the shared mystery player and reports its
// own result back — ranking and rewards are derived from those reports once
// the round ends.
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

export type GroupPlayerStatus = 'invited' | 'joined' | 'declined';
export type GroupGameStatus = 'lobby' | 'active' | 'finished';

export interface GroupPlayerRow {
  id: string;
  game_id: string;
  user_id: string;
  display_name: string;
  status: GroupPlayerStatus;
  attempts: number;
  solved: boolean;
  elapsed_ms: number | null;
}

export interface GroupGameRow {
  id: string;
  creator_id: string;
  status: GroupGameStatus;
  mystery_player: string | null;
  level: Level | null;
  round_seconds: number;
  created_at: string;
  started_at: string | null;
}

// Fastest-solver bonus on top of the normal per-solver reward — capped
// separately (and generously) since a real 5-person lobby is naturally rate
// limited by having to round up friends, unlike a solo round you can replay
// instantly.
const GROUP_WIN_BONUS = 8;
const REWARDED_GROUP_WINS_PER_DAY = 5;
const GROUP_WIN_STORAGE_KEY = 'strikr_group_win_rewards_v1';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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
  const [groupWinBonusToday, setGroupWinBonusToday] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(GROUP_WIN_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr()) setGroupWinBonusToday(parsed.count || 0);
      } catch {
        // ignore corrupt storage
      }
    });
  }, []);

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
    if (me.solved && game.level) {
      const capped = stats.gameWinsToday >= GAME_REWARDED_WINS_PER_DAY;
      const solveReward = capped ? 0 : rewardFor(game.level, me.attempts);
      if (solveReward > 0) {
        addDiamonds(solveReward);
        recordWin({ kind: 'game', firstTry: me.attempts === 1, xp: GAME_WIN_XP });
        reward += solveReward;
      }
    }

    const solvedJoined = players.filter((p) => p.status === 'joined' && p.solved && p.elapsed_ms != null);
    const fastest = solvedJoined.reduce<GroupPlayerRow | null>(
      (best, p) => (!best || p.elapsed_ms! < best.elapsed_ms! ? p : best),
      null
    );
    if (fastest && fastest.user_id === user.id && groupWinBonusToday < REWARDED_GROUP_WINS_PER_DAY) {
      addDiamonds(GROUP_WIN_BONUS);
      reward += GROUP_WIN_BONUS;
      setGroupWinBonusToday((prev) => {
        const next = prev + 1;
        AsyncStorage.setItem(GROUP_WIN_STORAGE_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
        return next;
      });
    }

    setLastReward(reward);
    if (reward > 0) fx.win();
  }, [game, players, user, stats.gameWinsToday, groupWinBonusToday, addDiamonds, recordWin]);

  const createGroup = useCallback(
    async (targetUserIds: string[], targetNames: string[], roundSeconds: number): Promise<{ error: string | null }> => {
      if (!user) return { error: 'not_authenticated' };
      const { error } = await supabase.rpc('create_group_game', {
        target_user_ids: targetUserIds,
        target_names: targetNames,
        round_seconds_arg: roundSeconds,
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

  const startGame = useCallback(
    async (level: Level): Promise<{ error: string | null }> => {
      if (!game) return { error: 'no_game' };
      const pool = PLAYERS.filter((p) => tierOf(p.n) === level);
      const mystery = pool[Math.floor(Math.random() * pool.length)];
      const { error } = await supabase
        .from('group_games')
        .update({ status: 'active', mystery_player: mystery.n, level, started_at: new Date().toISOString() })
        .eq('id', game.id)
        .eq('status', 'lobby');
      if (error) return { error: error.message };
      return { error: null };
    },
    [game]
  );

  const submitResult = useCallback(
    async (attempts: number, elapsedMs: number | null, solved: boolean): Promise<void> => {
      if (!game || !user) return;
      await supabase
        .from('group_game_players')
        .update({ attempts, solved, elapsed_ms: elapsedMs })
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

  return {
    game,
    players,
    loading,
    mysteryPlayer,
    isCreator: !!(game && user && game.creator_id === user.id),
    createGroup,
    respondInvite,
    cancelLobby,
    startGame,
    submitResult,
    finishGame,
    leaveFinished,
    refresh: loadActive,
    lastReward,
  };
}
