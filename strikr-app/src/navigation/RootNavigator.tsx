import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import DailyScreen from '../screens/DailyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LeaguesScreen from '../screens/LeaguesScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: undefined;
  Daily: undefined;
  Settings: undefined;
  Leagues: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const ONBOARDING_KEY = 'strikr_onboarding_seen_v1';

export default function RootNavigator() {
  const [checked, setChecked] = useState(false);
  const [seenOnboarding, setSeenOnboarding] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => {
      setSeenOnboarding(v === '1');
      setChecked(true);
    });
  }, []);

  if (!checked) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={seenOnboarding ? 'Tabs' : 'Onboarding'}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Daily" component={DailyScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Leagues" component={LeaguesScreen} options={{ presentation: 'card' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
