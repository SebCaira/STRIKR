import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useFriends, FriendRow } from '../state/friends';
import { useAuth } from '../state/auth';
import { supabase } from '../lib/supabase';
import { avatarColor } from '../lib/avatarColor';
import AvatarFrame from '../components/AvatarFrame';
import { XI_MATCHES } from '../data/xiMatches';

const PODIUM_SIZE: Record<number, { size: number; barH: number }> = {
  0: { size: 58, barH: 80 },
  1: { size: 46, barH: 58 },
  2: { size: 42, barH: 42 },
};

// Every game that supports a 1v1 duel — kept in sync with JeuxScreen's
// GAMES list (modes.duel === true there). XI Type is hidden the same way
// JeuxScreen hides it: no point offering a game with no match data yet.
type ChallengeGameId = 'main' | 'grille' | 'club' | 'liste' | 'xi';
const CHALLENGE_GAMES: { id: ChallengeGameId; icon: string; labelKey: string }[] = [
  { id: 'main', icon: '🎯', labelKey: 'jeux_game_main' },
  { id: 'grille', icon: '🧩', labelKey: 'jeux_game_grille' },
  { id: 'club', icon: '🏟️', labelKey: 'jeux_game_club' },
  { id: 'liste', icon: '📝', labelKey: 'jeux_game_liste' },
  ...(XI_MATCHES.length > 0 ? [{ id: 'xi' as const, icon: '🎽', labelKey: 'jeux_game_xi' }] : []),
];

export default function FriendsScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const { friends, requests, loading, refresh, sendRequest, respondRequest } = useFriends();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [myCode, setMyCode] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setMyCode(data?.referral_code ?? null));
  }, [user]);

  // Tapping the ⚔️ button opens a small game picker (below) instead of
  // sending straight to the Grille — challengeGame() fires once a game is
  // chosen. The various duel screens (nested inside the Jeux tab) own their
  // canonical hook instance each — this just hands them a signal to send
  // the invite, rather than running a second one here with its own realtime
  // subscription racing the one already live over there.
  const [challengeTarget, setChallengeTarget] = useState<FriendRow | null>(null);
  const challengeGame = (gameId: ChallengeGameId) => {
    if (!challengeTarget) return;
    navigation.navigate('Jeux', {
      mode: 'duel',
      game: gameId,
      inviteUserId: challengeTarget.id,
      inviteUserName: challengeTarget.display_name,
    });
    setChallengeTarget(null);
  };

  // Keeps XP/streak current when coming back to this tab after playing —
  // this screen stays mounted as a sibling tab so it won't refetch on its own.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const podium = friends.slice(0, 3);
  const rest = friends.slice(3);
  // Visual order for the podium is 2nd / 1st / 3rd.
  const podiumOrder = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;

  const [modalVisible, setModalVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleRespondRequest = async (requestId: string, accept: boolean) => {
    setRequestError(null);
    const { error } = await respondRequest(requestId, accept);
    if (error) setRequestError(t('error_generic'));
  };

  const openModal = () => {
    setModalMessage(null);
    setModalVisible(true);
  };

  const copyMyCode = async () => {
    if (!myCode) return;
    await Clipboard.setStringAsync(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const friendErrorMessage = (message: string): string =>
    message.includes('own_code') ? t('friends_error_own_code') :
    message.includes('already_friends') ? t('friends_error_already_friends') :
    message.includes('already_sent') ? t('friends_error_already_sent') :
    t('friends_error_invalid_code');

  const submitAdd = async () => {
    if (!codeInput.trim()) return;
    setBusy(true);
    const { error } = await sendRequest(codeInput.trim());
    setBusy(false);
    if (error) setModalMessage(friendErrorMessage(error));
    else {
      setCodeInput('');
      setModalMessage(t('friends_sent'));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, letterSpacing: -0.6 }} numberOfLines={1}>
            {t('friends_title')} 🏆
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 }}>{t('friends_subtitle')}</Text>
        </View>
        <Pressable onPress={openModal} style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: '#fff' }}>+</Text>
        </Pressable>
      </View>

      {requests.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 6 }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4 }}>{t('friends_requests_title')}</Text>
          {requests.map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }} numberOfLines={1}>{r.display_name}</Text>
              <Pressable onPress={() => handleRespondRequest(r.id, true)} style={{ paddingVertical: 7, paddingHorizontal: 12, backgroundColor: accent.mint, borderRadius: 999 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: '#1a1a1a' }}>{t('friends_accept')}</Text>
              </Pressable>
              <Pressable onPress={() => handleRespondRequest(r.id, false)} style={{ paddingVertical: 7, paddingHorizontal: 12, backgroundColor: colors.track, borderRadius: 999 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.muted }}>{t('friends_decline')}</Text>
              </Pressable>
            </View>
          ))}
          {requestError && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: accent.coral }}>{requestError}</Text>}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.muted} style={{ marginTop: 30 }} />
      ) : friends.length === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 24, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.muted, textAlign: 'center' }}>{t('friends_none')}</Text>
          <Pressable onPress={openModal} style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>{t('friends_add')}</Text>
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
                    <AvatarFrame frameId={p.equipped_frame} size={dims.size}>
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
                    </AvatarFrame>
                    <Text style={{ fontFamily: fonts.display, fontSize: rank === 1 ? 12 : 11, color: colors.ink }} numberOfLines={1}>
                      {p.display_name}
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
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 6 }}>{t('friends_classement')}</Text>
            <View style={{ gap: 5 }}>
              {(podium.length === 3 ? rest : friends).map((r: FriendRow, i: number) => {
                const rank = (podium.length === 3 ? 4 : 1) + i;
                return (
                  <View key={r.id} style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 }}>
                      <Text style={{ width: 22, fontFamily: fonts.display, fontSize: 13, color: colors.muted, textAlign: 'right' }}>{rank}</Text>
                      <AvatarFrame frameId={r.equipped_frame} size={28}>
                        <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: avatarColor(r.id), borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {r.avatar_url ? (
                            <Image source={{ uri: r.avatar_url }} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <Text style={{ fontFamily: fonts.display, fontSize: 11, color: '#1a1a1a' }}>{r.display_name.slice(0, 1).toUpperCase()}</Text>
                          )}
                        </View>
                      </AvatarFrame>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: fonts.display, fontSize: 12, color: colors.ink }}>{r.display_name}</Text>
                        <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>
                          {t('friends_streak')} {r.current_streak}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.ink }}>{r.xp} XP</Text>
                      <Pressable
                        onPress={() => setChallengeTarget(r)}
                        style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: accent.coral, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 13 }}>⚔️</Text>
                      </Pressable>
                    </View>
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
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: colors.border, borderRadius: 20, padding: 22, maxWidth: 320, width: '100%', gap: 14 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink }}>{t('friends_add')}</Text>

            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1 }}>{t('friends_your_code')}</Text>
              {myCode && (
                <Pressable
                  onPress={copyMyCode}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 12 }}
                >
                  <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink, letterSpacing: 2 }}>{myCode}</Text>
                  <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: colors.border, borderRadius: 999 }}>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.bg }}>{copied ? '✓' : t('friends_copy')}</Text>
                  </View>
                </Pressable>
              )}
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1 }}>{t('friends_code_placeholder')}</Text>
              <TextInput
                value={codeInput}
                onChangeText={setCodeInput}
                placeholder={t('friends_code_placeholder')}
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={{
                  fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink,
                  backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
                  paddingVertical: 12, paddingHorizontal: 14,
                }}
              />
              <Pressable onPress={submitAdd} disabled={busy} style={{ paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('friends_add_button')}</Text>}
              </Pressable>
            </View>

            {modalMessage && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>{modalMessage}</Text>}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!challengeTarget} transparent animationType="fade" onRequestClose={() => setChallengeTarget(null)}>
        <Pressable
          onPress={() => setChallengeTarget(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: colors.border, borderRadius: 20, padding: 22, maxWidth: 320, width: '100%', gap: 10 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink }}>
              {t('friends_choose_game_title')} — {challengeTarget?.display_name}
            </Text>
            {CHALLENGE_GAMES.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => challengeGame(g.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}
              >
                <Text style={{ fontSize: 18 }}>{g.icon}</Text>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{t(g.labelKey)}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
