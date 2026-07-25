// Sound/haptics/notifications preferences, persisted locally. Exposes plain
// getter functions too (getSoundEnabled/getHapticsEnabled) so non-component
// code like src/lib/fx.ts can check the current preference synchronously
// without needing a React context.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNotificationPermission, scheduleDailyReminder, cancelDailyReminder } from '../lib/notifications';
import { useI18n } from '../i18n/i18n';
import { useAuth } from './auth';

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
  const { t } = useI18n();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
          currentSettings = parsed;
          setSettings(parsed);
        } catch {
          // ignore corrupt storage, keep defaults
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  // Keep the OS-scheduled daily reminder in sync with the persisted
  // preference once the user is signed in (idempotent: schedule/cancel are
  // safe to call repeatedly), so a fresh install with the default-on toggle
  // actually gets the reminder without having to flip it off/on once. Gated
  // on `user` so the OS permission prompt never appears before login.
  useEffect(() => {
    if (!loaded || !user) return;
    if (settings.notificationsEnabled) {
      requestNotificationPermission().then((granted) => {
        if (granted) scheduleDailyReminder(t('notif_reminder_title'), t('notif_reminder_body'));
      });
    } else {
      cancelDailyReminder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, user]);

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
