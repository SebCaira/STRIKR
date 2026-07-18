import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/auth';
import { logEvent } from '../lib/analytics';
import { CellOwner, DuelGrid, checkWin, generateGrid, matchesCriteria } from './gridDuel';

export type DuelRole = 'creator' | 'opponent';

export interface DuelCell {
  owner: CellOwner;
  name: string | null;
}

export interface DuelRow {
  id: string;
  code: string;
  creator_id: string;
  opponent_id: string | null;
  grid: DuelGrid;
  cells: DuelCell[];
  used_players: string[];
  turn: DuelRole;
  status: 'waiting' | 'active' | 'finished';
  winner: DuelRole | 'draw' | null;
}

const EMPTY_CELLS: DuelCell[] = Array.from({ length: 9 }, () => ({ owner: null, name: null }));

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function useDuel() {
  const { user } = useAuth();
  const [duel, setDuel] = useState<DuelRow | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadActive = useCallback(async () => {
    if (!user) {
      setDuel(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('grid_duels')
      .select('*')
      .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setDuel((data as DuelRow | null) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (!duel) return;
    const channel = supabase
      .channel(`duel-${duel.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'grid_duels', filter: `id=eq.${duel.id}` },
        (payload) => setDuel(payload.new as DuelRow)
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [duel?.id]);

  const myRole = useCallback(
    (d: DuelRow): DuelRole => (d.creator_id === user?.id ? 'creator' : 'opponent'),
    [user]
  );

  const createDuel = useCallback(async (): Promise<{ error: string | null }> => {
    if (!user) return { error: 'not_authenticated' };
    const grid = generateGrid();
    const code = generateCode();
    const { data, error } = await supabase
      .from('grid_duels')
      .insert({ code, creator_id: user.id, grid, cells: EMPTY_CELLS, used_players: [], turn: 'creator', status: 'waiting' })
      .select()
      .single();
    if (error) return { error: error.message };
    setDuel(data as DuelRow);
    logEvent(user.id, 'duel_created');
    return { error: null };
  }, [user]);

  const joinDuel = useCallback(
    async (code: string): Promise<{ error: string | null }> => {
      if (!user) return { error: 'not_authenticated' };
      const { error } = await supabase.rpc('join_duel_by_code', { code_arg: code.trim() });
      if (error) return { error: error.message };
      await loadActive();
      return { error: null };
    },
    [user, loadActive]
  );

  const playCell = useCallback(
    async (index: number, name: string): Promise<{ error: string | null }> => {
      if (!duel || !user) return { error: 'no_duel' };
      if (duel.status !== 'active') return { error: 'not_active' };
      const role = myRole(duel);
      if (duel.turn !== role) return { error: 'not_your_turn' };
      if (duel.cells[index].owner) return { error: 'cell_taken' };
      const rowC = duel.grid.rows[Math.floor(index / 3)];
      const colC = duel.grid.cols[index % 3];
      const found = matchesCriteria(name, rowC, colC);
      if (!found) return { error: 'invalid_answer' };
      if (duel.used_players.includes(found.n)) return { error: 'player_used' };

      const cells = duel.cells.slice();
      cells[index] = { owner: role, name: found.n };
      const usedPlayers = [...duel.used_players, found.n];
      const won = checkWin(cells.map((c) => c.owner), role);
      const full = cells.every((c) => c.owner);
      const nextTurn = role === 'creator' ? 'opponent' : 'creator';

      const update = {
        cells,
        used_players: usedPlayers,
        turn: won || full ? duel.turn : nextTurn,
        status: won || full ? ('finished' as const) : ('active' as const),
        winner: won ? role : full ? ('draw' as const) : null,
      };
      const { error } = await supabase.from('grid_duels').update(update).eq('id', duel.id);
      if (error) return { error: error.message };
      setDuel({ ...duel, ...update });
      if (won || full) logEvent(user.id, 'duel_finished', { result: won ? role : 'draw' });
      return { error: null };
    },
    [duel, user, myRole]
  );

  // Either participant can bail out — the other is credited a win rather
  // than leaving the duel stuck forever with no timeout mechanism.
  const forfeit = useCallback(async (): Promise<void> => {
    if (!duel || !user) return;
    const role = myRole(duel);
    const otherRole: DuelRole = role === 'creator' ? 'opponent' : 'creator';
    await supabase.from('grid_duels').update({ status: 'finished', winner: otherRole }).eq('id', duel.id);
    setDuel(null);
  }, [duel, user, myRole]);

  const clearFinished = useCallback(() => setDuel(null), []);

  return { duel, loading, myRole: duel ? myRole(duel) : null, createDuel, joinDuel, playCell, forfeit, clearFinished, refresh: loadActive };
}
