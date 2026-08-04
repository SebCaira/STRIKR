// Local daily reminder notification (no backend/push token involved — Expo
// Go on recent SDKs no longer supports remote push, so this sticks to
// device-scheduled local notifications, which work fine for a "come back
// and play" nudge and need no server round-trip).
//
// Remote push (registerPushToken below) is separate: it only works in a
// standalone/EAS build (not Expo Go), and is used for friend duel-invite
// notifications sent from the backend via Expo's push API.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

const DAILY_REMINDER_ID = 'strikr-daily-reminder';
const REMINDER_HOUR = 19;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleDailyReminder(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: 0,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

// Gets (or lazily creates) this device's Expo push token and saves it on the
// signed-in user's profile so the backend can push friend duel-invite
// notifications to it. Silently no-ops on web, in Expo Go, or on a
// simulator, where no real push token exists.
export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token) await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  } catch {
    // no-op: push token isn't available in every environment (e.g. Expo Go)
  }
}

export async function clearPushToken(userId: string): Promise<void> {
  try {
    await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
  } catch {
    // no-op: best-effort cleanup, e.g. on sign-out
  }
}
