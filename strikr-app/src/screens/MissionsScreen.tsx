import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import HardShadowBox from '../components/HardShadowBox';

interface Mission {
  icon: string;
  iconBg: string;
  title: string;
  detail?: string;
  progress?: number;
  progressLabel?: string;
  done?: boolean;
  goLabel?: string;
  cardBg?: string;
  dark?: boolean;
  trailing?: string;
}

export default function MissionsScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const missions: Mission[] = [
    { icon: '✅', iconBg: colors.card, title: t('mission_1_title'), detail: t('mission_1_detail'), done: true, cardBg: accent.mint },
    { icon: '⚡', iconBg: accent.yellow, title: t('mission_2_title'), progress: 60, progressLabel: '0:42 / 0:30 · +150 XP' },
    { icon: '🎯', iconBg: accent.lightBlue, title: t('mission_3_title'), detail: t('mission_3_detail'), goLabel: t('btn_go') },
    { icon: '🏆', iconBg: accent.pink, title: t('mission_4_title'), progress: 33, progressLabel: '1/3 · +200 XP + badge' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, letterSpacing: -0.6 }}>
          {t('missions_title_1')} <Text style={{ color: accent.coral }}>{t('missions_title_2')}</Text>
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 }}>
          4 défis, <Text style={{ fontFamily: fonts.bodySemibold }}>+800 XP</Text> + badge légendaire.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('missions_progress')} 1/4</Text>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>+200 XP</Text>
        </View>
        <View style={{ height: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 999, overflow: 'hidden' }}>
          <View style={{ width: '25%', height: '100%', backgroundColor: accent.coral }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
        {missions.map((m, i) => (
          <HardShadowBox key={i} bg={m.cardBg || colors.card} radius={14} offset={3}>
            <View style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: m.iconBg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{m.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{m.title}</Text>
                {m.detail && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.muted, marginTop: 1 }}>{m.detail}</Text>}
                {m.progress !== undefined && (
                  <>
                    <View style={{ height: 5, backgroundColor: colors.track, borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
                      <View style={{ width: `${m.progress}%`, height: '100%', backgroundColor: '#ffb03c' }} />
                    </View>
                    <Text style={{ fontFamily: fonts.monoMedium, fontSize: 9, color: colors.muted, marginTop: 3 }}>{m.progressLabel}</Text>
                  </>
                )}
              </View>
              {m.done && (
                <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: colors.border, borderRadius: 999 }}>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.bg }}>{t('label_done')}</Text>
                </View>
              )}
              {m.goLabel && (
                <View style={{ paddingVertical: 6, paddingHorizontal: 11, backgroundColor: accent.blue, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 10, color: '#fff' }}>{m.goLabel}</Text>
                </View>
              )}
            </View>
          </HardShadowBox>
        ))}

        <HardShadowBox bg="#1a1a1a" shadowColor={accent.yellow} radius={14} offset={3}>
          <View style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: accent.yellow, borderWidth: 1.5, borderColor: accent.yellow, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>👑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>
                Défi <Text style={{ color: accent.yellow }}>HEBDO</Text>
              </Text>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: 'rgba(255,255,255,.75)', marginTop: 1 }}>{t('mission_5_detail')}</Text>
            </View>
            <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: accent.yellow }}>J-3</Text>
          </View>
        </HardShadowBox>
      </ScrollView>
    </View>
  );
}
