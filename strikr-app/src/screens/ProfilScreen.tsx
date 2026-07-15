import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useDiamonds } from '../state/diamonds';

const BADGES = ['⚽', '🔥', '⚡', '💎', '👑', '🎯'];
const BADGE_COLORS = ['#ffe66b', '#ff5a3c', '#2b3ff2', '#a8f5c6', '#7a2b52', '#ffcae0'];

const HISTORY = [
  { name: 'Erling Haaland', detail: 'Trouvé au 3ᵉ club · +2 💎', when: 'AUJ.', ok: true },
  { name: 'Kylian Mbappé', detail: 'Trouvé au 1ᵉʳ club · +3 💎', when: 'HIER', ok: true },
  { name: 'Cristiano Ronaldo', detail: 'Raté · streak stoppé', when: '-2j', ok: false },
];

export default function ProfilScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { diamonds } = useDiamonds();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, backgroundColor: accent.coral, borderRadius: 999, opacity: 0.08 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 20, alignItems: 'flex-end' }}>
          <Pressable onPress={() => navigation.getParent()?.navigate('Settings')}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink }}>⚙</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
          <View
            style={{
              width: 100, height: 100, borderRadius: 999, backgroundColor: accent.yellow,
              borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 40, color: colors.ink }}>V</Text>
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginTop: 14, letterSpacing: -0.4 }}>Vous</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            <View style={{ paddingVertical: 3, paddingHorizontal: 9, backgroundColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: accent.yellow, letterSpacing: 1 }}>LVL 14</Text>
            </View>
            <View style={{ paddingVertical: 3, paddingHorizontal: 9, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink }}>@vous</Text>
            </View>
          </View>
          <Pressable
            onPress={() => navigation.getParent()?.navigate('Friends')}
            style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: accent.blue, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}
          >
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: '#fff' }}>👥 {t('profil_my_friends')} · 3</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>LVL 14 · 1820 XP</Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>LVL 15 · 2000</Text>
          </View>
          <View style={{ height: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
            <View style={{ width: '85%', height: '100%', backgroundColor: accent.coral }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 8 }}>
          {[
            { bg: colors.card, val: '87', label: t('profil_solves') },
            { bg: accent.mint, val: '🔥 7', label: t('profil_streak') },
            { bg: accent.pink, val: `💎${diamonds}`, label: t('profil_gems') },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: s.bg, borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 9, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>{s.val}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, letterSpacing: 0.8 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{t('profil_badges')} · 8/24</Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: accent.coral, letterSpacing: 1 }}>{t('profil_all')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {BADGES.map((b, i) => (
              <View key={i} style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: BADGE_COLORS[i], borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{b}</Text>
              </View>
            ))}
            {[0, 1].map((i) => (
              <View key={`q${i}`} style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.muted, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>?</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{t('profil_history')}</Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: accent.coral, letterSpacing: 1 }}>{t('profil_all_2')}</Text>
          </View>
          <View style={{ gap: 5 }}>
            {HISTORY.map((h, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, backgroundColor: h.ok ? colors.card : accent.wrongRed, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: h.ok ? accent.mint : colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 12 }}>{h.ok ? '✓' : '✕'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{h.name}</Text>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>{h.detail}</Text>
                </View>
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>{h.when}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
