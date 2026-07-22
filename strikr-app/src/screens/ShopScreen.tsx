import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useDiamonds } from '../state/diamonds';
import { useAuth } from '../state/auth';
import { SHOP_PACKAGES, REWARDED_AD_DIAMONDS, REWARDED_AD_PER_DAY } from '../data/shop';
import HardShadowBox from '../components/HardShadowBox';
import { logEvent } from '../lib/analytics';

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

  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [adWatchedToday, setAdWatchedToday] = useState(0);
  const [adWatching, setAdWatching] = useState(false);

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
    (id: string, diamondsAmount: number) => {
      addDiamonds(diamondsAmount);
      logEvent(user?.id, 'shop_purchase', { package_id: id, diamonds: diamondsAmount });
      setConfirmation(t('shop_purchase_confirmed_prefix') + ' +' + diamondsAmount + ' 💎');
    },
    [addDiamonds, t, user]
  );

  const adReady = adWatchedToday < REWARDED_AD_PER_DAY;

  const watchAd = useCallback(() => {
    if (!adReady || adWatching) return;
    setAdWatching(true);
    // The count is persisted immediately (not after the simulated delay), so
    // leaving and re-entering the screen mid-delay can't be used to dodge
    // the daily cap and double up the reward.
    setAdWatchedToday((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(AD_WATCHED_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
      return next;
    });
    setTimeout(() => {
      addDiamonds(REWARDED_AD_DIAMONDS);
      setAdWatching(false);
      setConfirmation(t('shop_purchase_confirmed_prefix') + ' +' + REWARDED_AD_DIAMONDS + ' 💎');
    }, 2500);
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

      <View style={{ marginHorizontal: 20, marginTop: 10, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: accent.lightBlue, borderWidth: 2, borderColor: colors.border, borderRadius: 10 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: '#1a1a1a', letterSpacing: 0.6 }}>{t('shop_test_mode_banner')}</Text>
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

        {SHOP_PACKAGES.map((p, i) => (
          <HardShadowBox key={p.id} bg={p.popular ? accent.yellow : colors.card} radius={14} offset={3}>
            <Pressable onPress={() => buyPackage(p.id, p.diamonds + (p.bonus || 0))} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
        ))}
      </ScrollView>

      <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => setConfirmation(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setConfirmation(null)}>
          <View style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: colors.border, borderRadius: 20, padding: 22, maxWidth: 320, width: '100%', alignItems: 'center' }}>
            <Text style={{ fontSize: 34 }}>✅</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginTop: 8, textAlign: 'center' }}>{confirmation}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 6, textAlign: 'center' }}>{t('shop_test_mode_note')}</Text>
            <Pressable onPress={() => setConfirmation(null)} style={{ marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: accent.coral, borderRadius: 12 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>OK</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
