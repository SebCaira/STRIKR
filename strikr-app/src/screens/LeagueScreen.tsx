import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import HardShadowBox from '../components/HardShadowBox';
import { useLeagues, useLeagueLeaderboard, LeaderboardRow } from '../state/leagues';
import { avatarColor } from '../lib/avatarColor';
import { useDuel } from '../game/useDuel';

const PODIUM_SIZE: Record<number, { size: number; barH: number }> = {
  0: { size: 58, barH: 80 },
  1: { size: 46, barH: 58 },
  2: { size: 42, barH: 42 },
};

export default function LeagueScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { leagues, loading: leaguesLoading, createLeague, joinByCode, refresh: refreshLeagues } = useLeagues();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && leagues.length > 0) setSelectedId(leagues[0].id);
    if (selectedId && !leagues.some((l) => l.id === selectedId)) {
      setSelectedId(leagues.length > 0 ? leagues[0].id : null);
    }
  }, [leagues, selectedId]);

  const { leaderboard, loading: boardLoading, refresh: refreshLeaderboard } = useLeagueLeaderboard(selectedId);
  const { createDuel } = useDuel();
  const [challenging, setChallenging] = useState<string | null>(null);

  const challengeFriend = async (rowId: string) => {
    if (challenging) return;
    setChallenging(rowId);
    const { error } = await createDuel();
    setChallenging(null);
    if (!error) navigation.navigate('Duel');
  };

  // Keeps XP/streak current when coming back to this tab after playing —
  // this screen stays mounted as a sibling tab so it won't refetch on its own.
  useFocusEffect(
    useCallback(() => {
      refreshLeagues();
      refreshLeaderboard();
    }, [refreshLeagues, refreshLeaderboard])
  );
  const selectedLeague = leagues.find((l) => l.id === selectedId);

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  // Visual order for the podium is 2nd / 1st / 3rd.
  const podiumOrder = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState<'create' | 'join'>('create');
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const openModal = (tab: 'create' | 'join') => {
    setModalTab(tab);
    setModalError(null);
    setModalVisible(true);
  };

  const submitCreate = async () => {
    if (!nameInput.trim()) return;
    setBusy(true);
    const { error } = await createLeague(nameInput.trim());
    setBusy(false);
    if (error) setModalError(error);
    else {
      setNameInput('');
      setModalVisible(false);
    }
  };

  const submitJoin = async () => {
    if (!codeInput.trim()) return;
    setBusy(true);
    const { error } = await joinByCode(codeInput.trim());
    setBusy(false);
    if (error) setModalError(t('leagues_error_invalid_code'));
    else {
      setCodeInput('');
      setModalVisible(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, letterSpacing: -0.6 }} numberOfLines={1}>
            {selectedLeague ? selectedLeague.name : t('league_default_title')} 🏆
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 }}>{t('league_subtitle')}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={() => openModal('create')} style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: '#fff' }}>+</Text>
          </Pressable>
          <Pressable onPress={() => openModal('join')} style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: accent.blue, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14 }}>🔑</Text>
          </Pressable>
        </View>
      </View>

      {leagues.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flexGrow: 1 }}>
            {leagues.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => setSelectedId(l.id)}
                style={{
                  paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, borderColor: colors.border,
                  backgroundColor: l.id === selectedId ? accent.coral : colors.card,
                }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: l.id === selectedId ? '#fff' : colors.ink }} numberOfLines={1}>
                  {l.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={() => navigation.getParent()?.navigate('Leagues')}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1 }}>{t('league_manage_leagues')}</Text>
          </Pressable>
        </View>
      )}

      {leaguesLoading ? (
        <ActivityIndicator color={colors.muted} style={{ marginTop: 30 }} />
      ) : leagues.length === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 24, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.muted, textAlign: 'center' }}>{t('league_no_leagues')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Pressable onPress={() => openModal('create')} style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>{t('leagues_create')}</Text>
            </Pressable>
            <Pressable onPress={() => openModal('join')} style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: accent.blue, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>{t('leagues_join')}</Text>
            </Pressable>
          </View>
        </View>
      ) : boardLoading ? (
        <ActivityIndicator color={colors.muted} style={{ marginTop: 30 }} />
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
                        borderWidth: 2.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      }}
                    >
                      {p.avatar_url ? (
                        <Image source={{ uri: p.avatar_url }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Text style={{ fontFamily: fonts.display, fontSize: dims.size > 50 ? 20 : 16, color: '#1a1a1a' }}>
                          {p.display_name.slice(0, 1).toUpperCase()}
                        </Text>
                      )}
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
                    <View style={{ width: r.is_you ? 30 : 28, height: r.is_you ? 30 : 28, borderRadius: 999, backgroundColor: avatarColor(r.id), borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {r.avatar_url ? (
                        <Image source={{ uri: r.avatar_url }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Text style={{ fontFamily: fonts.display, fontSize: r.is_you ? 12 : 11, color: '#1a1a1a' }}>{r.display_name.slice(0, 1).toUpperCase()}</Text>
                      )}
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
                    {!r.is_you && (
                      <Pressable
                        onPress={() => challengeFriend(r.id)}
                        disabled={challenging === r.id}
                        style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: accent.coral, alignItems: 'center', justifyContent: 'center', opacity: challenging === r.id ? 0.6 : 1 }}
                      >
                        {challenging === r.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 13 }}>⚔️</Text>}
                      </Pressable>
                    )}
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
          </ScrollView>
        </>
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable
          onPress={() => setModalVisible(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: colors.border, borderRadius: 20, padding: 22, maxWidth: 320, width: '100%' }}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <Pressable
                onPress={() => { setModalTab('create'); setModalError(null); }}
                style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: modalTab === 'create' ? accent.coral : colors.card, borderWidth: 2, borderColor: colors.border }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: modalTab === 'create' ? '#fff' : colors.ink }}>{t('leagues_create')}</Text>
              </Pressable>
              <Pressable
                onPress={() => { setModalTab('join'); setModalError(null); }}
                style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: modalTab === 'join' ? accent.blue : colors.card, borderWidth: 2, borderColor: colors.border }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: modalTab === 'join' ? '#fff' : colors.ink }}>{t('leagues_join')}</Text>
              </Pressable>
            </View>

            {modalTab === 'create' ? (
              <>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder={t('leagues_create_placeholder')}
                  placeholderTextColor={colors.muted}
                  style={{
                    fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink,
                    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
                    paddingVertical: 12, paddingHorizontal: 14,
                  }}
                />
                <Pressable onPress={submitCreate} disabled={busy} style={{ marginTop: 12, paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('leagues_create')}</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  value={codeInput}
                  onChangeText={setCodeInput}
                  placeholder={t('leagues_join_placeholder')}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={{
                    fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink,
                    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
                    paddingVertical: 12, paddingHorizontal: 14,
                  }}
                />
                <Pressable onPress={submitJoin} disabled={busy} style={{ marginTop: 12, paddingVertical: 12, backgroundColor: accent.blue, borderRadius: 12, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('leagues_join')}</Text>}
                </Pressable>
              </>
            )}
            {modalError && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted, marginTop: 10 }}>{modalError}</Text>}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
