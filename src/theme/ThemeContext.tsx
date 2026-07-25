import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, lightColors, darkColors, accent, radii, fonts } from './theme';

const KEY = 'strikr_dark_mode_v1';

interface ThemeContextValue {
  dark: boolean;
  setDark: (d: boolean) => void;
  colors: ThemeColors;
  accent: typeof accent;
  radii: typeof radii;
  fonts: typeof fonts;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDarkState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === '1') setDarkState(true);
    });
  }, []);

  const setDark = useCallback((d: boolean) => {
    setDarkState(d);
    AsyncStorage.setItem(KEY, d ? '1' : '0').catch(() => {});
  }, []);

  const colors = dark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ dark, setDark, colors, accent, radii, fonts }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
