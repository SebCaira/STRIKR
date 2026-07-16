import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import HardShadowBox from '../components/HardShadowBox';
import { useFriends, LeaderboardRow } from '../state/friends';
import { avatarColor } from '../lib/avatarColor';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/auth';

const DEFAULT_LEAGUE_NAME = 'Ligue Or';

const PODIUM_SIZE: Record<number, { size: number; barH: number }> = {
  0: { size: 58, barH: 80 },
  1: { size: 46, barH: 58 },
  2: { size: 42, barH: 42 },
};

export default function LeagueScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const { leaderboard, loading } = useFriends();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [leagueName, setLeagueName] = useState(DEFAULT_LEAGUE_NAME);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('league_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.league_name) setLeagueName(data.league_name);
      });
  }, [user]);

  const openNameEditor = () => {
    setNameInput(leagueName);
    setNameModalVisible(true);
  };

  const saveLeagueName = async () => {
    const next = nameInput.trim() || DEFAULT_LEAGUE_NAME;
    setLeagueName(next);
    setNameModalVisible(false);
    if (user) {
      await supabase.from('profiles').update({ league_name: next }).eq('id', user.id);
    }
  };

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  // Visual order for the podium is 2nd / 1st / 3rd.
  const podiumOrder = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Pressable onPress={openNameEditor} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, letterSpacing: -0.6 }} numberOfLines={1}>
            {leagueName} 🏆
          </Text>
          <Text style={{ fontSize: 16, color: colors.muted }}>✏️</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 }}>{t('league_subtitle')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.muted} style={{ marginTop: 30 }} />
      ) : leaderboard.length <= 1 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 24, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.muted, textAlign: 'center' }}>{t('league_no_friends')}</Text>
          <Pressable
            onPress={() => navigation.getParent()?.navigate('Friends')}
            style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>{t('league_add_friends')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {podium.length === 3 && (
            <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
              {podiumOrder.map((p, i) => {
                const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
                const dims = PODIUM_SIZE[i === 1 ? 0 : i === 0 ? 1 : 2];
                const bg = avatarColor(p.id);
                return (
                  <View key={p.id} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                    {rank === 1 && <Text style={{ fontSize: 20 }}>👑</Text>}
                    <View
                      style={{
                        width: dims.size, height: dims.size, borderRadius: 999, backgroundColor: bg,
                        borderWidth: 2.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontFamily: fonts.display, fontSize: dims.size > 50 ? 20 : 16, color: '#1a1a1a' }}>
                        {p.display_name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: fonts.display, fontSize: rank === 1 ? 12 : 11, color: colors.ink }} numberOfLines={1}>
                      {p.is_you ? t('league_you') : p.display_name}
                    </Text>
                    <View
                      style={{
                        width: '100%', height: dims.barH, backgroundColor: bg, borderWidth: 2.5, borderColor: colors.border,
                        borderBottomWidth: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontFamily: fonts.display, fontSize: rank === 1 ? 28 : 20, color: '#1a1a1a' }}>{rank}</Text>
                      <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: '#1a1a1a' }}>{p.xp} XP</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 6 }}>{t('league_classement')}</Text>
            <View style={{ gap: 5 }}>
              {(podium.length === 3 ? rest : leaderboard).map((r: LeaderboardRow, i: number) => {
                const rank = (podium.length === 3 ? 4 : 1) + i;
                const row = (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: r.is_you ? 9 : 8 }}>
                    <Text style={{ width: 22, fontFamily: fonts.display, fontSize: r.is_you ? 14 : 13, color: r.is_you ? '#fff' : colors.muted, textAlign: 'right' }}>{rank}</Text>
                    <View style={{ width: r.is_you ? 30 : 28, height: r.is_you ? 30 : 28, borderRadius: 999, backgroundColor: avatarColor(r.id), borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: fonts.display, fontSize: r.is_you ? 12 : 11, color: '#1a1a1a' }}>{r.display_name.slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.display, fontSize: r.is_you ? 13 : 12, color: r.is_you ? '#fff' : colors.ink }}>
                        {r.is_you ? t('league_you') : r.display_name}
                      </Text>
                      {r.is_you && (
                        <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: 'rgba(255,255,255,.85)' }}>
                          {t('league_streak')} {r.current_streak}
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontFamily: fonts.mono, fontSize: r.is_you ? 12 : 11, color: r.is_you ? '#fff' : colors.ink }}>{r.xp} XP</Text>
                  </View>
                );
                return r.is_you ? (
                  <HardShadowBox key={r.id} bg={accent.coral} radius={12} offset={3}>
                    {row}
                  </HardShadowBox>
                ) : (
                  <View key={r.id} style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
                    {row}
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={() => navigation.getParent()?.navigate('Friends')}
              style={{ marginTop: 16, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{t('league_manage_friends')}</Text>
            </Pressable>
          </ScrollView>
        </>
      )}

      <Modal visible={nameModalVisible} transparent animationType="fade" onRequestClose={() => setNameModalVisible(false)}>
        <Pressable
          onPress={() => setNameModalVisible(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: colors.border, borderRadius: 20, padding: 22, maxWidth: 320, width: '100%' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginBottom: 14 }}>{t('league_rename_title')}</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={DEFAULT_LEAGUE_NAME}
              placeholderTextColor={colors.muted}
              style={{
                fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink,
                backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
                paddingVertical: 12, paddingHorizontal: 14,
              }}
            />
            <Pressable onPress={saveLeagueName} style={{ marginTop: 14, paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('league_rename_save')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
