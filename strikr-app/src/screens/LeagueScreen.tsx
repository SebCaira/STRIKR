import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import HardShadowBox from '../components/HardShadowBox';

const PODIUM = [
  { rank: 2, name: 'Maëlys', initial: 'M', bg: '#c9d8ff', score: '2 480', size: 46, barH: 58 },
  { rank: 1, name: 'Yanis', initial: 'Y', bg: '#ffe66b', score: '2 940', size: 58, barH: 80, crown: true },
  { rank: 3, name: 'Louis', initial: 'L', bg: '#ffcae0', score: '2 210', size: 42, barH: 42 },
];

const RANKS = [
  { rank: 4, name: 'Ambre', initial: 'A', bg: '#a8f5c6', fg: '#1a1a1a', score: '2 040' },
  { rank: 5, name: 'Karim', initial: 'K', bg: '#2b3ff2', fg: '#fff', score: '1 980' },
  { rank: 7, name: 'Sofia', initial: 'S', bg: '#7a2b52', fg: '#fff', score: '1 770' },
  { rank: 8, name: 'Théo', initial: 'T', bg: '#2a6f4d', fg: '#fff', score: '1 640' },
];

export default function LeagueScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, letterSpacing: -0.6 }}>
          Ligue <Text style={{ color: accent.coral }}>Or</Text> 🏆
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 }}>{t('league_subtitle')}</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
        {PODIUM.map((p) => (
          <View key={p.rank} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            {p.crown && <Text style={{ fontSize: 20 }}>👑</Text>}
            <View
              style={{
                width: p.size, height: p.size, borderRadius: 999, backgroundColor: p.bg,
                borderWidth: 2.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: p.size > 50 ? 20 : 16, color: '#1a1a1a' }}>{p.initial}</Text>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: p.crown ? 12 : 11, color: colors.ink }}>{p.name}</Text>
            <View
              style={{
                width: '100%', height: p.barH, backgroundColor: p.bg, borderWidth: 2.5, borderColor: colors.border,
                borderBottomWidth: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: p.crown ? 28 : 20, color: '#1a1a1a' }}>{p.rank}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: '#1a1a1a' }}>{p.score}</Text>
            </View>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 6 }}>{t('league_classement')}</Text>
        <View style={{ gap: 5 }}>
          {[RANKS[0], RANKS[1]].map((r) => (
            <View key={r.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <Text style={{ width: 22, fontFamily: fonts.display, fontSize: 13, color: colors.muted, textAlign: 'right' }}>{r.rank}</Text>
              <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: r.bg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 11, color: r.fg }}>{r.initial}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{r.name}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.ink }}>{r.score}</Text>
            </View>
          ))}

          <HardShadowBox bg={accent.coral} radius={12} offset={3}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9 }}>
              <Text style={{ width: 22, fontFamily: fonts.display, fontSize: 14, color: '#fff', textAlign: 'right' }}>6</Text>
              <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: accent.yellow, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#1a1a1a' }}>V</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('league_you')}</Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: 'rgba(255,255,255,.85)' }}>{t('league_streak')} 7 · +250 {t('league_today')}</Text>
              </View>
              <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: '#fff' }}>1 820</Text>
            </View>
          </HardShadowBox>

          {[RANKS[2], RANKS[3]].map((r) => (
            <View key={r.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <Text style={{ width: 22, fontFamily: fonts.display, fontSize: 13, color: colors.muted, textAlign: 'right' }}>{r.rank}</Text>
              <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: r.bg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 11, color: r.fg }}>{r.initial}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{r.name}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.ink }}>{r.score}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12 }}>
          <Pressable onPress={() => navigation.getParent()?.navigate('Friends')} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4 }}>{t('league_live_friends')}</Text>
            <View style={{ width: 6, height: 6, backgroundColor: accent.coral, borderRadius: 999 }} />
          </Pressable>
          <View style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, padding: 7, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: accent.yellow, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 11 }}>Y</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.ink }}>
                Yanis a trouvé en 1 essai · <Text style={{ color: accent.coral, fontFamily: fonts.displayBold }}>+3 💎</Text>
              </Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>2 min</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, padding: 7, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: '#2a6f4d', borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 11, color: '#fff' }}>T</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.ink }}>Théo a débloqué badge Buteur Fou ⚡</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>1h</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
