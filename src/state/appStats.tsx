// Small read-only hooks for real, app-wide numbers (total signups, per-round
// history) that used to be hardcoded copy. Not global contexts — only the
// screens that show this data call these.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

export function useTotalPlayers() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    supabase.rpc('get_total_players').then(({ data }) => {
      if (typeof data === 'number') setTotal(data);
    });
  }, []);

  return total;
}

export interface GameRound {
  id: string;
  kind: 'game' | 'daily';
  player_name: string;
  won: boolean;
  attempt: number | null;
  reward_diamonds: number;
  created_at: string;
}

export function useGameHistory(limit = 5) {
  const { user } = useAuth();
  const [history, setHistory] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('game_rounds')
      .select('id, kind, player_name, won, attempt, reward_diamonds, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    setHistory((data as GameRound[]) || []);
    setLoading(false);
  }, [user, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { history, loading, refresh };
}
