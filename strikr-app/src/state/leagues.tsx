// Leagues: named friend groups you create or join by invite code, each with
// its own XP leaderboard. Backed by Supabase RPCs (see migration
// replace_friendships_with_leagues). Not a global context — screens that
// need this call the hook directly.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

export interface MyLeague {
  id: string;
  name: string;
  invite_code: string;
  is_owner: boolean;
  member_count: number;
}

export interface LeaderboardRow {
  id: string;
  display_name: string;
  xp: number;
  diamonds: number;
  current_streak: number;
  is_you: boolean;
}

export function useLeagues() {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<MyLeague[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.rpc('get_my_leagues');
    setLeagues((data as MyLeague[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createLeague = useCallback(
    async (name: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc('create_league', { league_name: name });
      if (!error) await refresh();
      return { error: error ? error.message : null };
    },
    [refresh]
  );

  const joinByCode = useCallback(
    async (code: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc('join_league_by_code', { code });
      if (!error) await refresh();
      return { error: error ? error.message : null };
    },
    [refresh]
  );

  const leaveLeague = useCallback(
    async (leagueId: string) => {
      await supabase.rpc('leave_league', { target_league_id: leagueId });
      await refresh();
    },
    [refresh]
  );

  return { leagues, loading, refresh, createLeague, joinByCode, leaveLeague };
}

export function useLeagueLeaderboard(leagueId: string | null) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!leagueId) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.rpc('get_league_leaderboard', { target_league_id: leagueId });
    setLeaderboard((data as LeaderboardRow[]) || []);
    setLoading(false);
  }, [leagueId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { leaderboard, loading, refresh };
}
