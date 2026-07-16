import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useStats } from '../state/stats';
import { deriveMissions } from '../state/missions';
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
  onGo?: () => void;
  cardBg?: string;
  xp: number;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MissionsScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { stats } = useStats();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const { mission1Done, mission2Done, mission3Done, doneCount, xpAcquis, weeklyGoal, weeklyProgress, weeklyDone } =
    deriveMissions(stats);

  const mission2Progress = stats.fastestSolveMsToday === null ? 0 : Math.min(100, Math.round((30000 / stats.fastestSolveMsToday) * 100));
  const mission2Label =
    stats.fastestSolveMsToday === null
      ? `— / 0:30 · +150 XP`
      : `${formatMs(stats.fastestSolveMsToday)} / 0:30 · +150 XP`;

  const missions: Mission[] = [
    {
      icon: mission1Done ? '✅' : '⚽',
      iconBg: mission1Done ? colors.card : accent.mint,
      title: t('mission_1_title'),
      detail: t('mission_1_detail'),
      done: mission1Done,
      cardBg: mission1Done ? accent.mint : colors.card,
      xp: 200,
    },
    {
      icon: '⚡',
      iconBg: accent.yellow,
      title: t('mission_2_title'),
      progress: mission2Progress,
      progressLabel: mission2Label,
      done: mission2Done,
      cardBg: mission2Done ? accent.mint : colors.card,
      xp: 150,
    },
    {
      icon: mission3Done ? '✅' : '🎯',
      iconBg: mission3Done ? colors.card : accent.lightBlue,
      title: t('mission_3_title'),
      detail: t('mission_3_detail'),
      done: mission3Done,
      goLabel: mission3Done ? undefined : t('btn_go'),
      onGo: () => navigation.navigate('Game'),
      cardBg: mission3Done ? accent.mint : colors.card,
      xp: 250,
    },
    {
      icon: '🏆',
      iconBg: accent.pink,
      title: t('mission_4_title'),
      progress: 0,
      progressLabel: '0/3 · nécessite des amis en ligne',
      cardBg: colors.card,
      xp: 200,
    },
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
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('missions_progress')} {doneCount}/4</Text>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>+{xpAcquis} XP</Text>
        </View>
        <View style={{ height: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 999, overflow: 'hidden' }}>
          <View style={{ width: `${(doneCount / 4) * 100}%`, height: '100%', backgroundColor: accent.coral }} />
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
                <Pressable onPress={m.onGo} style={{ paddingVertical: 6, paddingHorizontal: 11, backgroundColor: accent.blue, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 10, color: '#fff' }}>{m.goLabel}</Text>
                </Pressable>
              )}
            </View>
          </HardShadowBox>
        ))}

        <HardShadowBox bg="#1a1a1a" shadowColor={accent.yellow} radius={14} offset={3}>
          <View style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: accent.yellow, borderWidth: 1.5, borderColor: accent.yellow, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>{weeklyDone ? '✅' : '👑'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>
                Défi <Text style={{ color: accent.yellow }}>HEBDO</Text>
              </Text>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: 'rgba(255,255,255,.75)', marginTop: 1 }}>{t('mission_5_detail')}</Text>
              <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,.15)', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
                <View style={{ width: `${weeklyProgress}%`, height: '100%', backgroundColor: accent.yellow }} />
              </View>
            </View>
            <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: accent.yellow }}>{stats.currentStreak}/{weeklyGoal}</Text>
          </View>
        </HardShadowBox>
      </ScrollView>
    </View>
  );
}
