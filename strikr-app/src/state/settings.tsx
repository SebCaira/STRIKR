// Sound/haptics/notifications preferences, persisted locally. Exposes plain
// getter functions too (getSoundEnabled/getHapticsEnabled) so non-component
// code like src/lib/fx.ts can check the current preference synchronously
// without needing a React context.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'strikr_settings_v1';

interface SettingsData {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: SettingsData = {
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: true,
};

let currentSettings: SettingsData = { ...DEFAULT_SETTINGS };
export function getSoundEnabled(): boolean {
  return currentSettings.soundEnabled;
}
export function getHapticsEnabled(): boolean {
  return currentSettings.hapticsEnabled;
}

interface SettingsContextValue {
  settings: SettingsData;
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        currentSettings = parsed;
        setSettings(parsed);
      } catch {
        // ignore corrupt storage, keep defaults
      }
    });
  }, []);

  const update = useCallback((patch: Partial<SettingsData>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      currentSettings = next;
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setSoundEnabled = useCallback((v: boolean) => update({ soundEnabled: v }), [update]);
  const setHapticsEnabled = useCallback((v: boolean) => update({ hapticsEnabled: v }), [update]);
  const setNotificationsEnabled = useCallback((v: boolean) => update({ notificationsEnabled: v }), [update]);

  return (
    <SettingsContext.Provider value={{ settings, setSoundEnabled, setHapticsEnabled, setNotificationsEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
