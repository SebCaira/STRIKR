// Tracks which players a user has already solved (won) at least once, so a
// solved player is permanently excluded from future draws — the "no more
// levels" pool works through the full roster like a collection, rather than
// looping the same names forever. Backed by profiles.solved_players (jsonb
// array), written through an atomic append RPC (mark_player_solved) so two
// near-simultaneous wins can't race and drop one.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

interface SolvedPlayersContextValue {
  solvedPlayers: Set<string>;
  markSolved: (name: string) => void;
  ready: boolean;
}

const SolvedPlayersContext = createContext<SolvedPlayersContextValue | null>(null);

export function SolvedPlayersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [solvedPlayers, setSolvedPlayers] = useState<Set<string>>(new Set());
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
      .select('solved_players')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setSolvedPlayers(new Set((data?.solved_players as string[] | undefined) || []));
        loadedForUser.current = user.id;
        setReady(true);
      });
  }, [user]);

  const markSolved = useCallback(
    (name: string) => {
      setSolvedPlayers((prev) => {
        if (prev.has(name)) return prev;
        const next = new Set(prev);
        next.add(name);
        return next;
      });
      if (user) {
        supabase.rpc('mark_player_solved', { player_name: name }).then(() => {});
      }
    },
    [user]
  );

  return (
    <SolvedPlayersContext.Provider value={{ solvedPlayers, markSolved, ready }}>
      {children}
    </SolvedPlayersContext.Provider>
  );
}

export function useSolvedPlayers() {
  const ctx = useContext(SolvedPlayersContext);
  if (!ctx) throw new Error('useSolvedPlayers must be used within SolvedPlayersProvider');
  return ctx;
}
