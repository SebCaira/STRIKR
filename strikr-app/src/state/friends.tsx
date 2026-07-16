// Friends + leaderboard, backed by Supabase RPCs (see migration
// create_friendships_and_leaderboard). Not a global context — each screen
// that needs this data calls the hook and manages its own refresh.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

export interface SearchResult {
  id: string;
  display_name: string;
}

export interface IncomingRequest {
  friendship_id: string;
  requester_id: string;
  requester_name: string;
  created_at: string;
}

export interface LeaderboardRow {
  id: string;
  display_name: string;
  xp: number;
  diamonds: number;
  current_streak: number;
  is_you: boolean;
}

export function useFriends() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [incomingRes, leaderboardRes] = await Promise.all([
      supabase.rpc('get_incoming_friend_requests'),
      supabase.rpc('get_friends_leaderboard'),
    ]);
    setIncoming((incomingRes.data as IncomingRequest[]) || []);
    setLeaderboard((leaderboardRes.data as LeaderboardRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return [];
    const { data } = await supabase.rpc('search_users_by_username', { query: query.trim() });
    return (data as SearchResult[]) || [];
  }, []);

  const sendRequest = useCallback(
    async (targetId: string): Promise<{ error: string | null }> => {
      if (!user) return { error: 'not signed in' };
      const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: targetId });
      return { error: error ? error.message : null };
    },
    [user]
  );

  const respondRequest = useCallback(
    async (friendshipId: string, accept: boolean) => {
      await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', friendshipId);
      await refresh();
    },
    [refresh]
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      if (!user) return;
      await supabase
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`);
      await refresh();
    },
    [user, refresh]
  );

  return { incoming, leaderboard, loading, refresh, search, sendRequest, respondRequest, removeFriend };
}
