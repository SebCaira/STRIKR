import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
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

// Tapping a duel-invite push notification (foreground, backgrounded, or
// cold-launch) jumps straight to the Grille duel screen — useDuel() already
// loads the invitee's most recent pending invite on mount, so no duel id
// needs to travel through the deep link.
function openDuelInviteFromNotification(data: unknown) {
  if (!(data as any)?.type || (data as any).type !== 'duel_invite') return;
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Tabs' as never, { screen: 'Jeux', params: { mode: 'duel' } } as never);
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
      openDuelInviteFromNotification(response.notification.request.content.data);
    });
    return () => sub.remove();
  }, []);

  // Cold launch (app was killed, user tapped the notification to open it):
  // the response is only safe to act on once the navigator has mounted, so
  // this checks it in onReady rather than racing it against `checked` above.
  const onNavigationReady = () => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openDuelInviteFromNotification(response.notification.request.content.data);
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
