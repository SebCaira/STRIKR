// Profile picture: stored in the public "avatars" Storage bucket, one file
// per user (path `${userId}/avatar.jpg`, upsert on re-upload), with the
// public URL cached on profiles.avatar_url so other screens (league
// leaderboard, etc.) can show it without an extra Storage round-trip.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

interface AvatarContextValue {
  avatarUrl: string | null;
  setAvatarUrl: (url: string) => void;
  ready: boolean;
}

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const loadedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setReady(false);
      loadedForUser.current = null;
      return;
    }
    if (loadedForUser.current === user.id) return;
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setAvatarUrlState(data?.avatar_url ?? null);
        loadedForUser.current = user.id;
        setReady(true);
      });
  }, [user]);

  const setAvatarUrl = useCallback(
    (url: string) => {
      setAvatarUrlState(url);
      if (user) {
        supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id).then(() => {});
      }
    },
    [user]
  );

  return <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl, ready }}>{children}</AvatarContext.Provider>;
}

export function useAvatar() {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error('useAvatar must be used within AvatarProvider');
  return ctx;
}
