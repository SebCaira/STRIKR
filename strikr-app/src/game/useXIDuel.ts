// "XI Type" duel: name the starting eleven of a famous match, alternating
// turns with a friend (unlike Mode Liste's duel, which has both players
// racing simultaneously) — each correct name is worth 1 point, most points
// once all 11 are found wins. Mirrors useDuel.ts's grid-duel plumbing
// closely (invite/accept/decline/turn timer/forfeit), swapping the 3x3 grid
// mechanics for a plain named list.
import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/auth';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { logEvent } from '../lib/analytics';
import { fx } from '../lib/fx';
import { stripAcc } from './engine';
import { XI_MATCHES } from '../data/xiMatches';
import { playerFull, playerBase } from '../data/quizLists';

export type XIDuelRole = 'creator' | 'opponent';

export interface XIFoundEntry {
  index: number;
  by: XIDuelRole;
  name: string;
}

export interface XIDuelRow {
  id: string;
  code: string;
  match_id: string;
  match_title: string;
  creator_id: string;
  opponent_id: string | null;
  creator_name: string | null;
  opponent_name: string | null;
  found: XIFoundEntry[];
  turn: XIDuelRole;
  creator_score: number;
  opponent_score: number;
  status: 'invited' | 'waiting' | 'active' | 'finished' | 'declined';
  winner: XIDuelRole | 'draw' | null;
  turn_started_at: string;
}

export const XI_DUEL_TURN_SECONDS = 45;

// Same reward economy as the Grille duel — nothing for a loss, capped per
// day so ping-ponging duels back and forth can't become an unlimited
// diamond faucet.
const WIN_REWARD = 6;
const DRAW_REWARD = 3;
const WIN_XP = 40;
const DRAW_XP = 15;
const REWARDED_PER_DAY = 5;
const STORAGE_KEY = 'strikr_xi_duel_rewards_v1';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Letters only: the on-screen keyboard has no hyphen/apostrophe keys, but
// real surnames do ("Alexander-Arnold", "Guivarc'h") — without this, those
// players could never be typed correctly no matter what's entered.
function norm(s: string): string {
  return stripAcc(s.trim().toLowerCase()).replace(/[^a-z]/g, '');
}

export function useXIDuel() {
  const { user } = useAuth();
  const { addDiamonds } = useDiamonds();
  const { recordWin } = useStats();
  const [duel, setDuel] = useState<XIDuelRow | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const rewardedDuelRef = useRef<string | null>(null);
  const [rewardedToday, setRewardedToday] = useState(0);
  const [lastReward, setLastReward] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr()) setRewardedToday(parsed.count || 0);
      } catch {
        // ignore corrupt storage
      }
    });
  }, []);

  const loadActive = useCallback(async () => {
    if (!user) {
      setDuel(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('xi_duels')
      .select('*')
      .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .in('status', ['waiting', 'active', 'invited', 'declined'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setDuel((data as XIDuelRow | null) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  // Separate from the per-duel channel below (which only exists once a duel
  // is already loaded) — this one is keyed by user id so an incoming invite
  // shows up immediately if the invitee is already sitting on this screen.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`xi-duel-invites-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'xi_duels', filter: `opponent_id=eq.${user.id}` },
        () => loadActive()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadActive]);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (!duel) return;
    const channel = supabase
      .channel(`xi-duel-${duel.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'xi_duels', filter: `id=eq.${duel.id}` },
        (payload) => setDuel(payload.new as XIDuelRow)
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [duel?.id]);

  // Fires once per finished duel (guarded by rewardedDuelRef) regardless of
  // which client actually made the winning move — both participants land
  // here via their own realtime update and credit themselves independently.
  useEffect(() => {
    if (!duel || !user || duel.status !== 'finished') return;
    if (rewardedDuelRef.current === duel.id) return;
    rewardedDuelRef.current = duel.id;
    const role = duel.creator_id === user.id ? 'creator' : 'opponent';
    const won = duel.winner === role;
    const draw = duel.winner === 'draw';
    if (!won && !draw) return;
    const reward = won ? WIN_REWARD : DRAW_REWARD;
    if (rewardedToday < REWARDED_PER_DAY) {
      addDiamonds(reward);
      setLastReward(reward);
      setRewardedToday((prev) => {
        const next = prev + 1;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
        return next;
      });
    } else {
      setLastReward(0);
    }
    recordWin({ kind: 'duel', firstTry: won, xp: won ? WIN_XP : DRAW_XP });
    fx.win();
  }, [duel, user, rewardedToday, addDiamonds, recordWin]);

  const myRole = useCallback(
    (d: XIDuelRow): XIDuelRole => (d.creator_id === user?.id ? 'creator' : 'opponent'),
    [user]
  );

  const inviteXIDuel = useCallback(
    async (targetUserId: string, targetName: string, matchId: string, matchTitle: string): Promise<{ error: string | null }> => {
      if (!user) return { error: 'not_authenticated' };
      const { data, error } = await supabase.rpc('invite_xi_duel', {
        target_user_id: targetUserId,
        target_name: targetName,
        match_id_arg: matchId,
        match_title_arg: matchTitle,
      });
      if (error) return { error: error.message };
      const newId = Array.isArray(data) ? data[0]?.id : null;
      if (newId) await loadActive();
      logEvent(user.id, 'xi_duel_invite_sent');
      return { error: null };
    },
    [user, loadActive]
  );

  const respondInvite = useCallback(
    async (accept: boolean): Promise<{ error: string | null }> => {
      if (!duel || !user) return { error: 'no_duel' };
      const { error } = await supabase.rpc('respond_xi_duel_invite', { duel_id: duel.id, accept });
      if (error) return { error: error.message };
      if (accept) {
        await loadActive();
      } else {
        setDuel(null);
      }
      logEvent(user.id, accept ? 'xi_duel_invite_accepted' : 'xi_duel_invite_declined');
      return { error: null };
    },
    [duel, user, loadActive]
  );

  const guessName = useCallback(
    async (raw: string): Promise<{ error: string | null }> => {
      if (!duel || !user) return { error: 'no_duel' };
      if (duel.status !== 'active') return { error: 'not_active' };
      const role = myRole(duel);
      if (duel.turn !== role) return { error: 'not_your_turn' };
      const match = XI_MATCHES.find((m) => m.id === duel.match_id);
      if (!match) return { error: 'invalid_answer' };

      const input = norm(raw);
      if (!input) return { error: 'invalid_answer' };

      const foundIndexes = new Set(duel.found.map((f) => f.index));
      const baseCounts = new Map<string, number>();
      match.players.forEach((p) => {
        const b = norm(playerBase(p));
        baseCounts.set(b, (baseCounts.get(b) || 0) + 1);
      });
      const idx = match.players.findIndex((p, i) => {
        if (foundIndexes.has(i)) return false;
        const full = norm(playerFull(p));
        const base = norm(playerBase(p));
        if (input === full) return true;
        if (input === base && (baseCounts.get(base) || 0) === 1) return true;
        return false;
      });
      if (idx === -1) return { error: 'invalid_answer' };

      const name = playerFull(match.players[idx]);
      const nextFound = [...duel.found, { index: idx, by: role, name }];
      const isDone = nextFound.length === match.players.length;
      const creatorScore = duel.creator_score + (role === 'creator' ? 1 : 0);
      const opponentScore = duel.opponent_score + (role === 'opponent' ? 1 : 0);
      const nextTurn: XIDuelRole = role === 'creator' ? 'opponent' : 'creator';
      const winner = isDone ? (creatorScore > opponentScore ? 'creator' : opponentScore > creatorScore ? 'opponent' : 'draw') : null;

      const update = {
        found: nextFound,
        creator_score: creatorScore,
        opponent_score: opponentScore,
        turn: isDone ? duel.turn : nextTurn,
        status: isDone ? ('finished' as const) : ('active' as const),
        winner,
        turn_started_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('xi_duels').update(update).eq('id', duel.id).eq('turn', role);
      if (error) return { error: error.message };
      setDuel({ ...duel, ...update });
      if (isDone) logEvent(user.id, 'xi_duel_finished', { result: winner });
      return { error: null };
    },
    [duel, user, myRole]
  );

  // Called by whichever client is on the clock when its local 45s countdown
  // hits zero — passes the turn without scoring. Guarded by `turn` still
  // matching the caller's role so a stale timer firing after the opponent
  // already moved (or after this player moved) can't double-pass.
  const passTurn = useCallback(async (): Promise<void> => {
    if (!duel || duel.status !== 'active') return;
    const role = myRole(duel);
    if (duel.turn !== role) return;
    const nextTurn: XIDuelRole = role === 'creator' ? 'opponent' : 'creator';
    const update = { turn: nextTurn, turn_started_at: new Date().toISOString() };
    const { error } = await supabase.from('xi_duels').update(update).eq('id', duel.id).eq('turn', role);
    if (!error) setDuel({ ...duel, ...update });
  }, [duel, myRole]);

  // Either participant can bail out — the other is credited a win rather
  // than leaving the duel stuck forever with no timeout mechanism.
  const forfeit = useCallback(async (): Promise<void> => {
    if (!duel || !user) return;
    const role = myRole(duel);
    const otherRole: XIDuelRole = role === 'creator' ? 'opponent' : 'creator';
    await supabase.from('xi_duels').update({ status: 'finished', winner: otherRole }).eq('id', duel.id);
    setDuel(null);
  }, [duel, user, myRole]);

  const clearFinished = useCallback(() => setDuel(null), []);

  // Distinct from forfeit(): an unanswered invite has no game to forfeit,
  // so marking it "declined" (rather than a forfeit loss with a winner that
  // never played) is the accurate outcome for the invitee to see.
  const cancelInvite = useCallback(async (): Promise<void> => {
    if (!duel) return;
    await supabase.from('xi_duels').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', duel.id);
    setDuel(null);
  }, [duel]);

  const match = duel ? XI_MATCHES.find((m) => m.id === duel.match_id) || null : null;

  return {
    duel,
    match,
    loading,
    myRole: duel ? myRole(duel) : null,
    inviteXIDuel,
    respondInvite,
    cancelInvite,
    guessName,
    passTurn,
    forfeit,
    clearFinished,
    refresh: loadActive,
    lastReward,
    rewardedToday,
    rewardedLimit: REWARDED_PER_DAY,
  };
}
