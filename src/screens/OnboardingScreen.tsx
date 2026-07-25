import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';

const ONBOARDING_KEY = 'strikr_onboarding_seen_v1';

export default function OnboardingScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [index, setIndex] = useState(0);

  const slides = [
    { emoji: '⚽', bg: accent.coral, title: t('ob1_title'), body: t('ob1_body') },
    { emoji: '🔤', bg: accent.blue, title: t('ob2_title'), body: t('ob2_body') },
    { emoji: '💎', bg: '#ffb03c', title: t('ob3_title'), body: t('ob3_body') },
  ];
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    navigation.replace('Tabs');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ padding: 20, alignItems: 'flex-end' }}>
        <Pressable onPress={finish}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.muted, letterSpacing: 1 }}>{t('onboarding_skip')}</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View
          style={{
            width: 72, height: 72, borderRadius: 20, backgroundColor: slide.bg,
            borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
            shadowColor: colors.border, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4,
          }}
        >
          <Text style={{ fontSize: 34 }}>{slide.emoji}</Text>
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginTop: 20, textAlign: 'center' }}>{slide.title}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 10, textAlign: 'center', lineHeight: 19 }}>{slide.body}</Text>

        {index === 0 && (
          <View style={{ marginTop: 20, gap: 6, width: '100%' }}>
            {[{ label: 'Bryne FK', done: true }, { label: 'Molde FK', done: true }, { label: '?', done: false }].map((row, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8,
                  backgroundColor: row.done ? colors.card : colors.track, borderWidth: 1.5,
                  borderColor: row.done ? colors.border : 'rgba(0,0,0,.2)', borderStyle: row.done ? 'solid' : 'dashed',
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{row.label}</Text>
                {row.done && <Text style={{ marginLeft: 'auto', color: '#1a7a2e' }}>✓</Text>}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 14 }}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 999, backgroundColor: i === index ? accent.coral : colors.track }}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24 + insets.bottom }}>
        <Pressable
          onPress={() => (isLast ? finish() : setIndex(index + 1))}
          style={{
            width: '100%', padding: 16, backgroundColor: accent.coral, borderRadius: 14,
            borderWidth: 2.5, borderColor: colors.border, alignItems: 'center',
            shadowColor: colors.border, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4,
          }}
        >
          <Text style={{ fontFamily: fonts.display, fontSize: 14, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>
            {isLast ? t('onboarding_start') : t('onboarding_next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
