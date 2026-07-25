// Shared diamond wallet across STRIKR's mini-games (main game + daily challenge).
// Backed by the signed-in user's Supabase profile row (login is mandatory,
// so there's no local-only/guest fallback to maintain).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

const DEFAULT_BALANCE = 200;

interface DiamondsContextValue {
  diamonds: number;
  addDiamonds: (delta: number) => void;
  // For deltas already applied server-side by some other RPC (e.g. redeeming
  // a referral code) — updates the local display without a second increment.
  syncLocalDelta: (delta: number) => void;
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
      // Sent as an atomic server-side increment (not a read-then-absolute-write),
      // so two rapid-fire spends/rewards can never race and clobber each other
      // when their network responses arrive out of order.
      if (user) {
        supabase.rpc('increment_diamonds', { delta_arg: delta }).then(() => {});
      }
      setDiamonds((prev) => Math.max(0, prev + delta));
    },
    [user]
  );

  const syncLocalDelta = useCallback((delta: number) => {
    setDiamonds((prev) => Math.max(0, prev + delta));
  }, []);

  return <DiamondsContext.Provider value={{ diamonds, addDiamonds, syncLocalDelta, ready }}>{children}</DiamondsContext.Provider>;
}

export function useDiamonds() {
  const ctx = useContext(DiamondsContext);
  if (!ctx) throw new Error('useDiamonds must be used within DiamondsProvider');
  return ctx;
}
