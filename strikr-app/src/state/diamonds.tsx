// Shared diamond wallet across STRIKR's mini-games (main game + daily challenge).
// Persisted so both screens reflect the same balance.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'strikr_diamonds_v1';
const DEFAULT_BALANCE = 320;

interface DiamondsContextValue {
  diamonds: number;
  addDiamonds: (delta: number) => void;
  ready: boolean;
}

const DiamondsContext = createContext<DiamondsContextValue | null>(null);

export function DiamondsProvider({ children }: { children: React.ReactNode }) {
  const [diamonds, setDiamonds] = useState(DEFAULT_BALANCE);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      const n = v === null ? DEFAULT_BALANCE : parseInt(v, 10) || 0;
      setDiamonds(n);
      setReady(true);
      loaded.current = true;
    });
  }, []);

  const addDiamonds = useCallback((delta: number) => {
    setDiamonds((prev) => {
      const next = Math.max(0, prev + delta);
      AsyncStorage.setItem(KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  return <DiamondsContext.Provider value={{ diamonds, addDiamonds, ready }}>{children}</DiamondsContext.Provider>;
}

export function useDiamonds() {
  const ctx = useContext(DiamondsContext);
  if (!ctx) throw new Error('useDiamonds must be used within DiamondsProvider');
  return ctx;
}
