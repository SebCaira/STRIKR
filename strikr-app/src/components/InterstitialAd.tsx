import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { INTERSTITIAL_COUNTDOWN_S } from '../data/shop';

export default function InterstitialAd({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const [remaining, setRemaining] = useState(INTERSTITIAL_COUNTDOWN_S);

  useEffect(() => {
    if (!visible) return;
    setRemaining(INTERSTITIAL_COUNTDOWN_S);
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ position: 'absolute', top: 16, left: 16, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: accent.yellow, borderRadius: 999 }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: '#1a1a1a', letterSpacing: 1 }}>{t('shop_test_mode_banner')}</Text>
        </View>
        <Text style={{ fontSize: 48 }}>📺</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 18, color: '#fff', marginTop: 16, textAlign: 'center' }}>
          {t('interstitial_title')}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 8, textAlign: 'center', maxWidth: 280 }}>
          {t('interstitial_body')}
        </Text>
        <Pressable
          onPress={onClose}
          disabled={remaining > 0}
          style={{
            marginTop: 28, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999,
            backgroundColor: remaining > 0 ? 'rgba(255,255,255,.15)' : accent.coral,
          }}
        >
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>
            {remaining > 0 ? `${t('interstitial_wait')} ${remaining}s` : t('interstitial_close')}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
