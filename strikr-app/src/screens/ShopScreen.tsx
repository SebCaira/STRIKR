import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useDiamonds } from '../state/diamonds';
import { useAuth } from '../state/auth';
import { SHOP_PACKAGES, REWARDED_AD_DIAMONDS, REWARDED_AD_PER_DAY, ADS_LIVE, MONETIZATION_LIVE } from '../data/shop';
import HardShadowBox from '../components/HardShadowBox';
import { logEvent } from '../lib/analytics';
import { showRewardedAd } from '../lib/ads';
import { purchasePackage } from '../lib/iap';

const AD_WATCHED_KEY = 'strikr_ad_watched_v1';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ShopScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { diamonds, addDiamonds } = useDiamonds();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [confirmation, setConfirmation] = useState<{ text: string; simulated: boolean } | null>(null);
  const [adWatchedToday, setAdWatchedToday] = useState(0);
  const [adWatching, setAdWatching] = useState(false);
  const [adError, setAdError] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(AD_WATCHED_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr()) setAdWatchedToday(parsed.count || 0);
      } catch {
        // ignore corrupt storage
      }
    });
  }, []);

  const buyPackage = useCallback(
    async (id: string, diamondsAmount: number) => {
      if (buying) return;
      setBuying(id);
      const { success } = await purchasePackage(id);
      setBuying(null);
      if (!success) return;
      addDiamonds(diamondsAmount);
      logEvent(user?.id, 'shop_purchase', { package_id: id, diamonds: diamondsAmount });
      setConfirmation({ text: t('shop_purchase_confirmed_prefix') + ' +' + diamondsAmount + ' 💎', simulated: true });
    },
    [addDiamonds, t, user, buying]
  );

  const adReady = adWatchedToday < REWARDED_AD_PER_DAY;

  const watchAd = useCallback(async () => {
    if (!adReady || adWatching) return;
    setAdWatching(true);
    setAdError(false);
    // The count is persisted immediately (not after the ad finishes), so
    // leaving and re-entering the screen mid-ad can't be used to dodge the
    // daily cap and double up the reward. It's refunded below on failure
    // (see there for why) — this still closes that gap, since the refund
    // only happens once showRewardedAd() actually settles, and leaving the
    // screen before that never lets it settle in the first place.
    setAdWatchedToday((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(AD_WATCHED_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
      return next;
    });
    // ads.ts's showRewardedAd() is designed to always resolve, never
    // reject, but this is the kind of code path that's already crashed
    // the app 5 times over — a try/catch here costs nothing and means a
    // regression there fails the ad request instead of the whole app.
    let success = true;
    if (ADS_LIVE) {
      try {
        ({ success } = await showRewardedAd());
      } catch (e) {
        console.warn('showRewardedAd() rejected', e);
        success = false;
      }
    }
    setAdWatching(false);
    if (!success) {
      // A failure here means no ad was actually shown (no fill, load
      // error, timeout) or the reward genuinely wasn't earned — either
      // way the player got nothing, so this attempt shouldn't burn one of
      // their 10 daily tries. Without this, a day with poor ad fill (e.g.
      // before the app is publicly listed) silently exhausts the cap
      // without a single real ad ever being seen.
      setAdWatchedToday((prev) => {
        const next = Math.max(0, prev - 1);
        AsyncStorage.setItem(AD_WATCHED_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
        return next;
      });
      setAdError(true);
      return;
    }
    addDiamonds(REWARDED_AD_DIAMONDS);
    setConfirmation({ text: t('shop_ad_confirmed_prefix') + ' +' + REWARDED_AD_DIAMONDS + ' 💎', simulated: !ADS_LIVE });
  }, [adReady, adWatching, addDiamonds, t]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink }}>←</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, letterSpacing: -0.4, flex: 1 }}>{t('shop_title')}</Text>
        <View style={{ paddingVertical: 5, paddingHorizontal: 10, backgroundColor: accent.mint, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: '#1a1a1a' }}>💎 {diamonds}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
        <HardShadowBox bg="#1a1a1a" shadowColor={accent.yellow} radius={14} offset={3}>
          <Pressable
            onPress={watchAd}
            disabled={!adReady || adWatching}
            style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: !adReady ? 0.55 : 1 }}
          >
            <Text style={{ fontSize: 26 }}>📺</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 14, color: '#fff' }}>
                {adWatching ? t('shop_ad_loading') : `${t('shop_ad_title')} +${REWARDED_AD_DIAMONDS} 💎`}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
                {adReady ? `${t('shop_ad_sub')} · ${adWatchedToday}/${REWARDED_AD_PER_DAY}` : t('shop_ad_exhausted')}
              </Text>
            </View>
          </Pressable>
        </HardShadowBox>
        {adError && (
          <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted, textAlign: 'center' }}>
            {t('shop_ad_unavailable')}
          </Text>
        )}

        {MONETIZATION_LIVE ? (
          SHOP_PACKAGES.map((p) => (
            <HardShadowBox key={p.id} bg={p.popular ? accent.yellow : colors.card} radius={14} offset={3}>
              <Pressable
                onPress={() => buyPackage(p.id, p.diamonds + (p.bonus || 0))}
                disabled={!!buying}
                style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: buying && buying !== p.id ? 0.5 : 1 }}
              >
                <Text style={{ fontSize: 30 }}>💎</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink }}>
                    {p.diamonds}
                    {p.bonus ? ` +${p.bonus}` : ''}
                  </Text>
                  {p.popular && (
                    <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.ink, letterSpacing: 1, marginTop: 1 }}>
                      {t('shop_popular')}
                    </Text>
                  )}
                </View>
                <View style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: p.popular ? '#1a1a1a' : accent.coral, borderRadius: 10 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>{p.priceLabel}</Text>
                </View>
              </Pressable>
            </HardShadowBox>
          ))
        ) : (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <Text style={{ fontSize: 32 }}>🚧</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginTop: 10, textAlign: 'center' }}>
              {t('shop_coming_soon_title')}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 17 }}>
              {t('shop_coming_soon_body')}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => setConfirmation(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setConfirmation(null)}>
          <View style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: colors.border, borderRadius: 20, padding: 22, maxWidth: 320, width: '100%', alignItems: 'center' }}>
            <Text style={{ fontSize: 34 }}>✅</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginTop: 8, textAlign: 'center' }}>{confirmation?.text}</Text>
            {confirmation?.simulated && (
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 6, textAlign: 'center' }}>{t('shop_test_mode_note')}</Text>
            )}
            <Pressable onPress={() => setConfirmation(null)} style={{ marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: accent.coral, borderRadius: 12 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>OK</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
