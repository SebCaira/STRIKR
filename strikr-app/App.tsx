import React, { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  InterTight_700Bold,
  InterTight_800ExtraBold,
  InterTight_900Black,
} from '@expo-google-fonts/inter-tight';
import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { I18nProvider } from './src/i18n/i18n';
import { AuthProvider, useAuth } from './src/state/auth';
import { DiamondsProvider, useDiamonds } from './src/state/diamonds';
import { StatsProvider, useStats } from './src/state/stats';
import { AvatarProvider } from './src/state/avatar';
import { SolvedPlayersProvider } from './src/state/solvedPlayers';
import { SettingsProvider } from './src/state/settings';
import RootNavigator from './src/navigation/RootNavigator';
import AuthScreen from './src/screens/AuthScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell() {
  const { colors, dark } = useTheme();
  const { session, loading } = useAuth();
  const { ready: diamondsReady } = useDiamonds();
  const { ready: statsReady } = useStats();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <AuthScreen />
      </View>
    );
  }

  if (!diamondsReady || !statsReady) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <RootNavigator />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    InterTight_700Bold,
    InterTight_800ExtraBold,
    InterTight_900Black,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const onLayout = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <DiamondsProvider>
                <StatsProvider>
                  <AvatarProvider>
                    <SolvedPlayersProvider>
                      <SettingsProvider>
                        <AppShell />
                      </SettingsProvider>
                    </SolvedPlayersProvider>
                  </AvatarProvider>
                </StatsProvider>
              </DiamondsProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </View>
  );
}
