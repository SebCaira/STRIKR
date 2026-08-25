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

  // Retries instead of a single short timeout: right after an OTA update,
  // the first launch on the new bundle does extra cold-start work (bundle
  // verification, a fresh Metro/Hermes warmup, re-establishing the
  // Supabase session) on top of the network round trip, so a one-shot
  // fetch used to lose that race often enough to permanently fall back to
  // DEFAULT_BALANCE for the rest of the session — displaying 200 while the
  // real server balance (never touched, addDiamonds always writes via an
  // atomic RPC) stayed correct underneath. Same fix already applied to the
  // streak/XP load in stats.tsx.
  useEffect(() => {
    if (!user) {
      setReady(false);
      loadedForUser.current = null;
      return;
    }
    if (loadedForUser.current === user.id) return;
    let cancelled = false;
    let attempt = 0;
    const MAX_ATTEMPTS = 5;

    const tryLoad = () => {
      attempt += 1;
      supabase
        .from('profiles')
        .select('diamonds')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (cancelled) return;
          // A request can resolve without throwing (so .catch() below never
          // fires) yet still carry an `error` — e.g. the Supabase session
          // isn't fully re-established yet right after an OTA cold start.
          // Treat that exactly like a network failure (retry) instead of
          // silently accepting `data: undefined` as "loaded successfully".
          if (error) throw error;
          setDiamonds(data?.diamonds ?? DEFAULT_BALANCE);
          loadedForUser.current = user.id;
          setReady(true);
        })
        .catch(() => {
          if (cancelled) return;
          if (attempt < MAX_ATTEMPTS) {
            setTimeout(tryLoad, 3000);
            return;
          }
          // Genuinely can't reach the server after several tries — let the
          // player use the app with the default for this session.
          setDiamonds(DEFAULT_BALANCE);
          loadedForUser.current = user.id;
          setReady(true);
        });
    };
    tryLoad();
    return () => {
      cancelled = true;
    };
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
