// Global XP leaderboard — distinct from useFriends' friends-only ranking.
// profiles' SELECT policy is "own row only" (see friends.tsx), so reading
// across every player needs the same SECURITY DEFINER RPC pattern already
// used for get_my_friends: get_global_leaderboard (top N by XP) and
// get_my_global_rank (your own rank/XP even when you're outside the top N).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

export interface LeaderboardRow {
  rank: number;
  id: string;
  display_name: string;
  xp: number;
  avatar_url: string | null;
  equipped_frame: string | null;
  is_you: boolean;
}

export interface MyGlobalRank {
  rank: number;
  xp: number;
  total: number;
}

const LEADERBOARD_SIZE = 100;

export function useGlobalLeaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [myRank, setMyRank] = useState<MyGlobalRank | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setRows([]);
      setMyRank(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: leaderboardData }, { data: rankData }] = await Promise.all([
      supabase.rpc('get_global_leaderboard', { limit_arg: LEADERBOARD_SIZE }),
      supabase.rpc('get_my_global_rank'),
    ]);
    setRows((leaderboardData as LeaderboardRow[]) || []);
    setMyRank(((rankData as MyGlobalRank[]) || [])[0] || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, myRank, loading, refresh };
}
