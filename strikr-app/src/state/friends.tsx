// Friends: a flat, mutual add-by-code relationship (see migration
// replace_leagues_with_friendships) — no more separate named groups; every
// accepted friend is directly usable for a Duel challenge or a Group invite.
// Adding a friend reuses the same code already shown for referrals
// (profiles.referral_code) so there's only one code to share, not two.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

export interface FriendRow {
  id: string;
  display_name: string;
  xp: number;
  diamonds: number;
  current_streak: number;
  avatar_url: string | null;
  equipped_frame: string | null;
  is_you: boolean;
}

export interface FriendRequestRow {
  id: string;
  requester_id: string;
  display_name: string;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [requests, setRequests] = useState<FriendRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: friendData }, { data: requestData }] = await Promise.all([
      supabase.rpc('get_my_friends'),
      supabase.rpc('get_pending_friend_requests'),
    ]);
    setFriends((friendData as FriendRow[]) || []);
    setRequests((requestData as FriendRequestRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendRequest = useCallback(
    async (code: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc('send_friend_request', { code_arg: code });
      if (!error) await refresh();
      return { error: error ? error.message : null };
    },
    [refresh]
  );

  const respondRequest = useCallback(
    async (requestId: string, accept: boolean): Promise<{ error: string | null }> => {
      const { error } = await supabase.rpc('respond_friend_request', { request_id: requestId, accept });
      if (!error) await refresh();
      return { error: error ? error.message : null };
    },
    [refresh]
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      await supabase.rpc('remove_friend', { friend_id: friendId });
      await refresh();
    },
    [refresh]
  );

  return { friends, requests, loading, refresh, sendRequest, respondRequest, removeFriend };
}
