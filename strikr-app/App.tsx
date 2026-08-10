import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ensureAdsInitialized } from './src/lib/ads';
import { MONETIZATION_LIVE } from './src/data/shop';
import { initIAP } from './src/lib/iap';
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
import LevelUpModal from './src/components/LevelUpModal';
import DailyRewardModal from './src/components/DailyRewardModal';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Kicks off the AdMob SDK init as early as possible, unconditional (not
// gated on auth/session) — ads.ts itself awaits this same promise before
// ever creating a RewardedAd/InterstitialAd instance, so by the time a
// user can reach a "watch an ad" button it's long since resolved.
ensureAdsInitialized().catch(() => {});

function AppShell() {
  const { colors, dark } = useTheme();
  const { session, loading } = useAuth();
  const { ready: diamondsReady } = useDiamonds();
  const { ready: statsReady } = useStats();

  // Only connects to the store once purchases are actually live — no point
  // opening a StoreKit connection while ShopScreen still shows "coming soon".
  useEffect(() => {
    if (session && MONETIZATION_LIVE) initIAP();
  }, [session]);

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
      <LevelUpModal />
      <DailyRewardModal />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontsError] = useFonts({
    InterTight_700Bold,
    InterTight_800ExtraBold,
    InterTight_900Black,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  const ready = fontsLoaded || !!fontsError;

  const onLayout = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

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
