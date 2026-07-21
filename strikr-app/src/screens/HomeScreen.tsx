import React, { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { deriveMissions } from '../state/missions';
import { useLeagues } from '../state/leagues';
import { useTotalPlayers } from '../state/appStats';
import { AVERAGE_CLUBS_PER_PLAYER } from '../data/players';
import HardShadowBox from '../components/HardShadowBox';

export default function HomeScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { diamonds } = useDiamonds();
  const { stats, derived } = useStats();
  const missions = deriveMissions(stats);
  const { leagues, refresh: refreshLeagues } = useLeagues();
  const totalPlayers = useTotalPlayers();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const topLeague = leagues[0];

  // Home/Profil/League all stay mounted as sibling tabs, each with its own
  // useLeagues() instance — without this, creating/joining a league on the
  // League tab wouldn't show up here until the app fully reloads.
  useFocusEffect(
    useCallback(() => {
      refreshLeagues();
    }, [refreshLeagues])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', top: -30, right: -30, width: 180, height: 180,
          backgroundColor: accent.coral, borderRadius: 999, opacity: 0.08,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 200, left: -40, width: 140, height: 140,
          backgroundColor: accent.blue, borderRadius: 999, opacity: 0.06,
        }}
      />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 32, height: 32, backgroundColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14 }}>⚽</Text>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, letterSpacing: -0.4 }}>STRIKR</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: accent.yellow, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: '#1a1a1a' }}>🔥 {stats.currentStreak}</Text>
            </View>
            <Pressable
              onPress={() => navigation.getParent()?.navigate('Shop')}
              style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: accent.mint, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: '#1a1a1a' }}>💎 {diamonds}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <HardShadowBox bg="#1a1a1a" borderColor="#1a1a1a" shadowColor={accent.coral} radius={18} offset={5} borderWidth={2.5}>
            <View style={{ padding: 18, overflow: 'hidden', borderRadius: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: accent.yellow, letterSpacing: 2 }}>{t('home_puzzle_kicker')}</Text>
                  <Text style={{ fontFamily: fonts.display, fontSize: 40, color: '#fff', marginTop: 6, letterSpacing: -1 }}>
                    {t('home_puzzle_number_prefix')}{stats.solves + 1}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 8, maxWidth: 170, lineHeight: 17 }}>
                    {t('home_puzzle_body')}
                  </Text>
                </View>
                <View style={{ width: 72, height: 88, borderRadius: 12, borderWidth: 2, borderColor: accent.yellow, alignItems: 'center', justifyContent: 'center', backgroundColor: accent.coral, transform: [{ rotate: '6deg' }] }}>
                  <Text style={{ fontSize: 44 }}>👤</Text>
                </View>
              </View>
              <Pressable
                onPress={() => navigation.navigate('Jeux', { mode: 'game' })}
                style={{ width: '100%', marginTop: 16, paddingVertical: 14, backgroundColor: accent.yellow, borderRadius: 12, borderWidth: 2.5, borderColor: accent.yellow, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: fonts.display, fontSize: 14, color: '#1a1a1a', letterSpacing: 1, textTransform: 'uppercase' }}>{t('home_play_now')}</Text>
              </Pressable>
              <Text style={{ fontFamily: fonts.monoMedium, fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 8, textAlign: 'center', letterSpacing: 1.5 }}>
                {t('home_stats_players')} · {totalPlayers === null ? '…' : totalPlayers.toLocaleString('fr-FR')} · {t('home_stats_avg_prefix')} {AVERAGE_CLUBS_PER_PLAYER.toFixed(1)} {t('home_stats_avg_suffix')}
              </Text>
            </View>
          </HardShadowBox>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', gap: 8 }}>
          {[
            { bg: colors.card, val: String(stats.solves), label: t('home_solves') },
            { bg: accent.mint, val: `🔥 ${stats.bestStreak}`, label: t('home_best') },
            { bg: accent.pink, val: `${derived.firstTryPercent}%`, label: t('home_first_try') },
          ].map((s, i) => (
            <HardShadowBox key={i} bg={s.bg} radius={12} offset={3} style={{ flex: 1 }}>
              <View style={{ padding: 10 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{s.val}</Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 1 }}>{s.label}</Text>
              </View>
            </HardShadowBox>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 8 }}>
          <HardShadowBox bg={accent.blue} shadowColor={accent.yellow} radius={14} offset={3}>
            <Pressable onPress={() => navigation.getParent()?.navigate('Daily')} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 26 }}>🔤</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: accent.yellow, letterSpacing: 1.4 }}>{t('home_daily_kicker')}</Text>
                <Text style={{ fontFamily: fonts.display, fontSize: 15, color: '#fff', marginTop: 2 }}>{t('home_daily_title')}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,.75)', marginTop: 1 }}>{t('home_daily_sub')}</Text>
              </View>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: accent.yellow }}>→</Text>
            </Pressable>
          </HardShadowBox>

          <HardShadowBox bg="#1a1a1a" shadowColor={accent.yellow} radius={14} offset={3}>
            <Pressable onPress={() => navigation.navigate('League')} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 26 }}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: accent.yellow, letterSpacing: 1.4 }}>{t('home_league_kicker')}</Text>
                {topLeague ? (
                  <>
                    <Text style={{ fontFamily: fonts.display, fontSize: 15, color: '#fff', marginTop: 2 }} numberOfLines={1}>{topLeague.name}</Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>
                      {topLeague.member_count} {t('leagues_members')}{leagues.length > 1 ? ` · +${leagues.length - 1} ${t('home_league_more')}` : ''}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ fontFamily: fonts.display, fontSize: 15, color: '#fff', marginTop: 2 }}>{t('league_create_or_join')}</Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>{t('home_league_none_sub')}</Text>
                  </>
                )}
              </View>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: accent.yellow }}>→</Text>
            </Pressable>
          </HardShadowBox>

          <HardShadowBox bg={colors.card} radius={14} offset={3}>
            <Pressable onPress={() => navigation.getParent()?.navigate('Missions')} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 26 }}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, letterSpacing: 1.4 }}>{t('home_missions_kicker')}</Text>
                <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginTop: 2 }}>{missions.doneCount}/4 · +{missions.xpAcquis} XP acquis</Text>
                <View style={{ height: 5, backgroundColor: colors.track, borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
                  <View style={{ width: `${(missions.doneCount / 4) * 100}%`, height: '100%', backgroundColor: accent.coral }} />
                </View>
              </View>
            </Pressable>
          </HardShadowBox>
        </View>
      </ScrollView>
    </View>
  );
}
