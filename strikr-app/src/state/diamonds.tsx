// Shared diamond wallet across STRIKR's mini-games (main game + daily challenge).
// Backed by the signed-in user's Supabase profile row (login is mandatory,
// so there's no local-only/guest fallback to maintain).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

const DEFAULT_BALANCE = 320;

interface DiamondsContextValue {
  diamonds: number;
  addDiamonds: (delta: number) => void;
  ready: boolean;
}

const DiamondsContext = createContext<DiamondsContextValue | null>(null);

export function DiamondsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [diamonds, setDiamonds] = useState(DEFAULT_BALANCE);
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
      .select('diamonds')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setDiamonds(data?.diamonds ?? DEFAULT_BALANCE);
        loadedForUser.current = user.id;
        setReady(true);
      });
  }, [user]);

  const addDiamonds = useCallback(
    (delta: number) => {
      setDiamonds((prev) => {
        const next = Math.max(0, prev + delta);
        if (user) {
          supabase.from('profiles').update({ diamonds: next }).eq('id', user.id).then(() => {});
        }
        return next;
      });
    },
    [user]
  );

  return <DiamondsContext.Provider value={{ diamonds, addDiamonds, ready }}>{children}</DiamondsContext.Provider>;
}

export function useDiamonds() {
  const ctx = useContext(DiamondsContext);
  if (!ctx) throw new Error('useDiamonds must be used within DiamondsProvider');
  return ctx;
}
