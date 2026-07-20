// Profile picture: stored in the public "avatars" Storage bucket, one file
// per user (path `${userId}/avatar.jpg`, upsert on re-upload), with the
// public URL cached on profiles.avatar_url so other screens (league
// leaderboard, etc.) can show it without an extra Storage round-trip.
// Also owns the purely-cosmetic avatar frame catalog (owned/equipped),
// bought with diamonds — a diamond sink with no gameplay effect.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';
import { useDiamonds } from './diamonds';
import { AVATAR_FRAMES } from '../data/avatarFrames';

interface AvatarContextValue {
  avatarUrl: string | null;
  setAvatarUrl: (url: string) => void;
  ownedFrames: string[];
  equippedFrame: string | null;
  buyFrame: (id: string) => { error: string | null };
  equipFrame: (id: string | null) => void;
  ready: boolean;
}

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { diamonds, addDiamonds } = useDiamonds();
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(null);
  const [ownedFrames, setOwnedFrames] = useState<string[]>([]);
  const [equippedFrame, setEquippedFrame] = useState<string | null>(null);
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
      .select('avatar_url, owned_frames, equipped_frame')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setAvatarUrlState(data?.avatar_url ?? null);
        setOwnedFrames((data?.owned_frames as string[] | null) ?? []);
        setEquippedFrame(data?.equipped_frame ?? null);
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

  const buyFrame = useCallback(
    (id: string): { error: string | null } => {
      if (ownedFrames.includes(id)) return { error: 'already_owned' };
      const frame = AVATAR_FRAMES.find((f) => f.id === id);
      if (!frame) return { error: 'unknown_frame' };
      if (diamonds < frame.cost) return { error: 'not_enough_diamonds' };
      addDiamonds(-frame.cost);
      const next = [...ownedFrames, id];
      setOwnedFrames(next);
      setEquippedFrame(id);
      if (user) {
        supabase.from('profiles').update({ owned_frames: next, equipped_frame: id }).eq('id', user.id).then(() => {});
      }
      return { error: null };
    },
    [ownedFrames, diamonds, addDiamonds, user]
  );

  const equipFrame = useCallback(
    (id: string | null) => {
      setEquippedFrame(id);
      if (user) {
        supabase.from('profiles').update({ equipped_frame: id }).eq('id', user.id).then(() => {});
      }
    },
    [user]
  );

  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl, ownedFrames, equippedFrame, buyFrame, equipFrame, ready }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error('useAvatar must be used within AvatarProvider');
  return ctx;
}
