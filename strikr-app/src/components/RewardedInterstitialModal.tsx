import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useRewardedInterstitial } from '../state/rewardedInterstitial';
import { useDiamonds } from '../state/diamonds';
import { showRewardedInterstitialAd } from '../lib/ads';
import { REWARDED_INTERSTITIAL_DIAMONDS } from '../data/shop';
import HardShadowBox from './HardShadowBox';

// Mounted once at the app root (see App.tsx) — the opt-in replacement for
// the old forced "every 5 rounds" interstitial (see
// src/state/rewardedInterstitial.tsx for how any screen triggers this same
// prompt). The player can always decline and continue for free; nothing
// here ever blocks the game the way a forced interstitial did.
export default function RewardedInterstitialModal() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { visible, resolve } = useRewardedInterstitial();
  const { addDiamonds } = useDiamonds();
  const [watching, setWatching] = useState(false);

  const decline = () => {
    if (watching) return;
    resolve();
  };

  const watch = async () => {
    if (watching) return;
    setWatching(true);
    const { success } = await showRewardedInterstitialAd();
    setWatching(false);
    if (success) addDiamonds(REWARDED_INTERSTITIAL_DIAMONDS);
    resolve();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={decline}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <HardShadowBox bg={colors.card} shadowColor={colors.border} radius={20} offset={5}>
          <View style={{ padding: 26, alignItems: 'center', maxWidth: 300 }}>
            <Text style={{ fontSize: 38 }}>📺</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginTop: 10, textAlign: 'center' }}>
              {t('rewarded_interstitial_title')}
            </Text>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center' }}>
              {t('rewarded_interstitial_body')}
            </Text>
            <View style={{ marginTop: 14, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: accent.mint, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: '#1a1a1a' }}>+{REWARDED_INTERSTITIAL_DIAMONDS} 💎</Text>
            </View>
            <Pressable
              onPress={watch}
              disabled={watching}
              style={{
                marginTop: 20, paddingVertical: 12, paddingHorizontal: 28, backgroundColor: accent.coral,
                borderRadius: 12, opacity: watching ? 0.7 : 1, minWidth: 190, alignItems: 'center',
              }}
            >
              {watching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>{t('rewarded_interstitial_watch')}</Text>
              )}
            </Pressable>
            <Pressable onPress={decline} disabled={watching} style={{ marginTop: 10, paddingVertical: 8 }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted }}>{t('rewarded_interstitial_decline')}</Text>
            </Pressable>
          </View>
        </HardShadowBox>
      </View>
    </Modal>
  );
}
