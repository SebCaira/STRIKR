import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ensureAdsInitialized } from './src/lib/ads';
import { installGlobalErrorHandler } from './src/lib/crashReporter';
import { MONETIZATION_LIVE } from './src/data/shop';
import { initIAP } from './src/lib/iap';
import { logEvent } from './src/lib/analytics';
// Each family's barrel index.js does `export const X = require('./weight.ttf')`
// for every single weight in one file — Metro evaluates the whole module
// once anything is imported from it, so importing even one named export
// from the barrel pulled in all ~18 weights' .ttf files as bundled assets.
// Importing each weight from its own subpath (confirmed by inspecting the
// packages: every weight folder has its own index.js requiring only that
// one file) means only the 7 weights actually used ship in the bundle.
import { useFonts } from 'expo-font';
import { InterTight_700Bold } from '@expo-google-fonts/inter-tight/700Bold';
import { InterTight_800ExtraBold } from '@expo-google-fonts/inter-tight/800ExtraBold';
import { InterTight_900Black } from '@expo-google-fonts/inter-tight/900Black';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { I18nProvider } from './src/i18n/i18n';
import { AuthProvider, useAuth } from './src/state/auth';
import { DiamondsProvider, useDiamonds } from './src/state/diamonds';
import { AdBudgetProvider } from './src/state/adBudget';
import { StatsProvider, useStats } from './src/state/stats';
import { AvatarProvider } from './src/state/avatar';
import { SolvedPlayersProvider } from './src/state/solvedPlayers';
import { SettingsProvider } from './src/state/settings';
import { RewardedInterstitialProvider } from './src/state/rewardedInterstitial';
import RootNavigator from './src/navigation/RootNavigator';
import AuthScreen from './src/screens/AuthScreen';
import LevelUpModal from './src/components/LevelUpModal';
import DailyRewardModal from './src/components/DailyRewardModal';
import RewardedInterstitialModal from './src/components/RewardedInterstitialModal';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Installed before ensureAdsInitialized() so it's in place for the very
// first native callback that could possibly fire.
installGlobalErrorHandler();
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
  const loggedOpen = useRef(false);

  // Only connects to the store once purchases are actually live — no point
  // opening a StoreKit connection while ShopScreen still shows "coming soon".
  useEffect(() => {
    if (session && MONETIZATION_LIVE) initIAP();
  }, [session]);

  // One 'app_open' per app launch (not per re-render/session refresh) — the
  // only way to see day-1/day-7 retention later: 'login'/'signup' only fire
  // once ever per account, so without this there'd be no signal at all for
  // an already-authenticated user simply coming back on a later day.
  useEffect(() => {
    if (session && !loggedOpen.current) {
      loggedOpen.current = true;
      logEvent(session.user.id, 'app_open');
    }
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
      <RewardedInterstitialModal />
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
                <AdBudgetProvider>
                  <StatsProvider>
                    <AvatarProvider>
                      <SolvedPlayersProvider>
                        <SettingsProvider>
                          <RewardedInterstitialProvider>
                            <AppShell />
                          </RewardedInterstitialProvider>
                        </SettingsProvider>
                      </SolvedPlayersProvider>
                    </AvatarProvider>
                  </StatsProvider>
                </AdBudgetProvider>
              </DiamondsProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </View>
  );
}
