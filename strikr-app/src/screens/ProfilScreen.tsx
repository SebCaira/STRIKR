import React, { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { useAuth } from '../state/auth';
import { useLeagues } from '../state/leagues';
import { useGameHistory } from '../state/appStats';
import { BADGES } from '../lib/badges';

function formatRelativeDay(iso: string, t: (k: string) => string): string {
  const day = iso.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (day === today) return t('profil_today');
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (day === yesterday) return t('profil_yesterday');
  const diffDays = Math.round((new Date(today).getTime() - new Date(day).getTime()) / 86400000);
  return `-${diffDays}${t('profil_days_ago_suffix')}`;
}

export default function ProfilScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t, tArray } = useI18n();
  const { diamonds } = useDiamonds();
  const { stats, derived } = useStats();
  const { user } = useAuth();
  const { leagues, refresh: refreshLeagues } = useLeagues();
  const { history, refresh: refreshHistory } = useGameHistory(5);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const username = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Vous';
  const ordinals = tArray('ordinals');

  // Profil stays mounted in the tab navigator, so without this the history
  // and league count would keep showing whatever they were on first load —
  // stale after finishing a game or joining a league elsewhere.
  useFocusEffect(
    useCallback(() => {
      refreshHistory();
      refreshLeagues();
    }, [refreshHistory, refreshLeagues])
  );
  const badgeStates = BADGES.map((b) => ({ ...b, unlocked: b.isUnlocked(stats, derived.level) }));
  const unlockedCount = badgeStates.filter((b) => b.unlocked).length;

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
            <Text style={{ fontFamily: fonts.display, fontSize: 40, color: colors.ink }}>{username.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginTop: 14, letterSpacing: -0.4 }}>{username}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            <View style={{ paddingVertical: 3, paddingHorizontal: 9, backgroundColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: accent.yellow, letterSpacing: 1 }}>LVL {derived.level}</Text>
            </View>
            <View style={{ paddingVertical: 3, paddingHorizontal: 9, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink }}>@{username}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => navigation.getParent()?.navigate('Leagues')}
            style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: accent.blue, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}
          >
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: '#fff' }}>🏆 {t('profil_my_leagues')} · {leagues.length}</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>LVL {derived.level} · {derived.xpIntoLevel} XP</Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>LVL {derived.level + 1} · {derived.xpForNextLevel}</Text>
          </View>
          <View style={{ height: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
            <View style={{ width: `${Math.round(derived.levelProgress * 100)}%`, height: '100%', backgroundColor: accent.coral }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 8 }}>
          {[
            { bg: colors.card, val: String(stats.solves), label: t('profil_solves'), onPress: undefined },
            { bg: accent.mint, val: `🔥 ${stats.currentStreak}`, label: t('profil_streak'), onPress: undefined },
            { bg: accent.pink, val: `💎${diamonds}`, label: t('profil_gems'), onPress: () => navigation.getParent()?.navigate('Shop') },
          ].map((s, i) => {
            const Wrapper = s.onPress ? Pressable : View;
            return (
              <Wrapper key={i} onPress={s.onPress} style={{ flex: 1, backgroundColor: s.bg, borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 9, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>{s.val}</Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, letterSpacing: 0.8 }}>{s.label}</Text>
              </Wrapper>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{t('profil_badges')} · {unlockedCount}/{badgeStates.length}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {badgeStates.map((b) =>
              b.unlocked ? (
                <View key={b.id} style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: b.bg, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>{b.icon}</Text>
                </View>
              ) : (
                <View key={b.id} style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.muted, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>?</Text>
                </View>
              )
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{t('profil_history')}</Text>
          </View>
          {history.length === 0 ? (
            <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted, paddingVertical: 8 }}>{t('profil_no_history')}</Text>
          ) : (
            <View style={{ gap: 5 }}>
              {history.map((h) => (
                <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, backgroundColor: h.won ? colors.card : accent.wrongRed, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: h.won ? accent.mint : colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: 12 }}>{h.won ? '✓' : '✕'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{h.player_name}</Text>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>
                      {h.won
                        ? `${t('profil_found_at')} ${ordinals[(h.attempt || 1) - 1] || h.attempt} ${t('profil_club')} · +${h.reward_diamonds} 💎`
                        : t('profil_missed')}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>{formatRelativeDay(h.created_at, t)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
