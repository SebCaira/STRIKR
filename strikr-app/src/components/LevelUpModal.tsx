import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { levelUpBonus, useStats } from '../state/stats';
import HardShadowBox from './HardShadowBox';

// Mounted once at the app root (see App.tsx) so a level-up during any game
// screen shows the same celebration, regardless of which tab triggered it.
export default function LevelUpModal() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { levelUpEvent, clearLevelUpEvent } = useStats();
  const bonus = levelUpEvent !== null ? levelUpBonus(levelUpEvent) : 0;

  return (
    <Modal visible={levelUpEvent !== null} transparent animationType="fade" onRequestClose={clearLevelUpEvent}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        onPress={clearLevelUpEvent}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <HardShadowBox bg={accent.yellow} shadowColor={colors.border} radius={20} offset={5}>
            <View style={{ padding: 28, alignItems: 'center', maxWidth: 300 }}>
              <Text style={{ fontSize: 42 }}>📈</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: '#1a1a1a', marginTop: 10, textAlign: 'center' }}>
                {t('level_up_title_prefix')} {levelUpEvent}
              </Text>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: '#1a1a1a', marginTop: 8, textAlign: 'center' }}>
                {t('level_up_body')}
              </Text>
              <View style={{ marginTop: 14, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#1a1a1a', borderRadius: 999 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: accent.yellow }}>+{bonus} 💎</Text>
              </View>
              <Pressable
                onPress={clearLevelUpEvent}
                style={{ marginTop: 20, paddingVertical: 11, paddingHorizontal: 28, backgroundColor: '#1a1a1a', borderRadius: 12 }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>{t('level_up_close')}</Text>
              </Pressable>
            </View>
          </HardShadowBox>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
