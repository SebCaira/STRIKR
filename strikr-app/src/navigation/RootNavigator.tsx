import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { XI_MATCHES } from '../data/xiMatches';
import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import DailyScreen from '../screens/DailyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ShopScreen from '../screens/ShopScreen';
import MissionsScreen from '../screens/MissionsScreen';
import CollectionScreen from '../screens/CollectionScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: undefined;
  Daily: undefined;
  Settings: undefined;
  Shop: undefined;
  Missions: undefined;
  Collection: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const ONBOARDING_KEY = 'strikr_onboarding_seen_v1';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Tapping any of the 5 invite/social push notification types (foreground,
// backgrounded, or cold-launch) routes to the relevant screen. For
// duel_invite/xi_duel_invite, useDuel()/useXIDuel() already load the
// invitee's most recent pending invite on mount, so no id needs to travel
// through the deep link — same for group_invite via useGroupGame(), except
// there the actual game TYPE (main/club/liste/grille, or the 'xi' variant of
// liste) has to be resolved first so JeuxScreen renders the right screen
// under it, since GroupGameScreen's rendering keys off the `gameType` prop
// it's given, not off the loaded row.
async function openInviteFromNotification(data: unknown) {
  const type = (data as any)?.type;
  if (!type) return;

  if (type === 'duel_invite') {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Tabs' as never, { screen: 'Jeux', params: { mode: 'duel' } } as never);
    return;
  }
  if (type === 'xi_duel_invite') {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Tabs' as never, { screen: 'Jeux', params: { mode: 'duel', game: 'xi' } } as never);
    return;
  }
  if (type === 'friend_request' || type === 'friend_request_accepted') {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Tabs' as never, { screen: 'Friends' } as never);
    return;
  }
  if (type === 'group_invite') {
    const gameId = (data as any)?.game_id;
    let game = 'main';
    if (gameId) {
      const { data: row } = await supabase.from('group_games').select('game_type, list_id').eq('id', gameId).maybeSingle();
      if (row?.game_type === 'liste' && row.list_id && XI_MATCHES.some((m) => m.id === row.list_id)) {
        game = 'xi';
      } else if (row?.game_type) {
        game = row.game_type;
      }
    }
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Tabs' as never, { screen: 'Jeux', params: { mode: 'group', game } } as never);
  }
}

export default function RootNavigator() {
  const [checked, setChecked] = useState(false);
  const [seenOnboarding, setSeenOnboarding] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => {
      setSeenOnboarding(v === '1');
      setChecked(true);
    });
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openInviteFromNotification(response.notification.request.content.data);
    });
    return () => sub.remove();
  }, []);

  // Cold launch (app was killed, user tapped the notification to open it):
  // the response is only safe to act on once the navigator has mounted, so
  // this checks it in onReady rather than racing it against `checked` above.
  const onNavigationReady = () => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openInviteFromNotification(response.notification.request.content.data);
    });
  };

  if (!checked) return null;

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={seenOnboarding ? 'Tabs' : 'Onboarding'}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Daily" component={DailyScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Shop" component={ShopScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Missions" component={MissionsScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Collection" component={CollectionScreen} options={{ presentation: 'card' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
