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
import { DiamondsProvider } from './src/state/diamonds';
import { StatsProvider } from './src/state/stats';
import { SettingsProvider } from './src/state/settings';
import RootNavigator from './src/navigation/RootNavigator';
import AuthScreen from './src/screens/AuthScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell() {
  const { colors, dark } = useTheme();
  const { session, loading } = useAuth();

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
                  <SettingsProvider>
                    <AppShell />
                  </SettingsProvider>
                </StatsProvider>
              </DiamondsProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </View>
  );
}
