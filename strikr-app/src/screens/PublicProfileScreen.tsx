// Read-only public profile — reached by tapping a name in the global
// leaderboard (see FriendsScreen). Deliberately shows only what the player
// agreed to make public (level/XP, win stats, collection count) via the
// get_public_profile SECURITY DEFINER RPC — never diamonds or anything
// account-private, since profiles' own RLS is "own row only" and this RPC
// is the one deliberate hole in that for a chosen subset of fields.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { supabase } from '../lib/supabase';
import { avatarColor } from '../lib/avatarColor';
import { levelForXp } from '../state/stats';
import { PLAYERS } from '../data/players';
import AvatarFrame from '../components/AvatarFrame';
import HardShadowBox from '../components/HardShadowBox';
import { RootStackParamList } from '../navigation/RootNavigator';

interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  equipped_frame: string | null;
  xp: number;
  solves: number;
  total_wins: number;
  first_try_wins: number;
  current_streak: number;
  best_streak: number;
  collection_count: number;
}

export default function PublicProfileScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'PublicProfile'>>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc('get_public_profile', { target_user_id: userId })
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(((data as PublicProfile[]) || [])[0] || null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const derived = profile ? levelForXp(profile.xp) : null;
  const firstTryPercent = profile && profile.total_wins > 0 ? Math.round((profile.first_try_wins / profile.total_wins) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 10, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink }}>←</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <ActivityIndicator color={colors.ink} />
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>{t('public_profile_loading')}</Text>
        </View>
      ) : !profile || !derived ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>{t('public_profile_not_found')}</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <View style={{ alignItems: 'center' }}>
            <AvatarFrame frameId={profile.equipped_frame} size={100}>
              <View
                style={{
                  width: 100, height: 100, borderRadius: 999, backgroundColor: avatarColor(profile.id),
                  borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}
              >
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ fontFamily: fonts.display, fontSize: 40, color: '#1a1a1a' }}>{profile.display_name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
            </AvatarFrame>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginTop: 14, letterSpacing: -0.4 }}>{profile.display_name}</Text>
            <View style={{ paddingVertical: 3, paddingHorizontal: 9, backgroundColor: colors.border, borderRadius: 999, marginTop: 6 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: accent.yellow, letterSpacing: 1 }}>LVL {derived.level}</Text>
            </View>
          </View>

          <View style={{ paddingTop: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>LVL {derived.level} · {derived.xpIntoLevel} XP</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>LVL {derived.level + 1} · {derived.xpForNext}</Text>
            </View>
            <View style={{ height: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
              <View style={{ width: `${Math.round(derived.progress * 100)}%`, height: '100%', backgroundColor: accent.coral }} />
            </View>
          </View>

          <View style={{ paddingTop: 16, flexDirection: 'row', gap: 8 }}>
            {[
              { bg: colors.card, val: String(profile.solves), label: t('home_solves') },
              { bg: accent.mint, val: `🔥 ${profile.current_streak}`, label: t('home_best') },
              { bg: accent.pink, val: `${firstTryPercent}%`, label: t('home_first_try') },
            ].map((s, i) => (
              <HardShadowBox key={i} bg={s.bg} radius={12} offset={3} style={{ flex: 1 }}>
                <View style={{ padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>{s.val}</Text>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 1 }}>{s.label}</Text>
                </View>
              </HardShadowBox>
            ))}
          </View>

          <View style={{ paddingTop: 8, flexDirection: 'row', gap: 8 }}>
            <HardShadowBox bg={colors.card} radius={12} offset={3} style={{ flex: 1 }}>
              <View style={{ padding: 10, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>{profile.total_wins}</Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 1 }}>{t('public_profile_wins')}</Text>
              </View>
            </HardShadowBox>
            <HardShadowBox bg={colors.card} radius={12} offset={3} style={{ flex: 1 }}>
              <View style={{ padding: 10, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>🏆 {profile.best_streak}</Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, letterSpacing: 1, marginTop: 1 }}>{t('public_profile_best')}</Text>
              </View>
            </HardShadowBox>
          </View>

          <View style={{ paddingTop: 10 }}>
            <HardShadowBox bg={accent.coral} shadowColor="#1a1a1a" radius={14} offset={3}>
              <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 26 }}>🃏</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: 'rgba(255,255,255,.8)', letterSpacing: 1.4 }}>{t('profil_my_collection')}</Text>
                  <Text style={{ fontFamily: fonts.display, fontSize: 15, color: '#fff', marginTop: 2 }}>{profile.collection_count}/{PLAYERS.length}</Text>
                </View>
              </View>
            </HardShadowBox>
          </View>
        </View>
      )}
    </View>
  );
}
