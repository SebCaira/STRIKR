import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import HardShadowBox from '../components/HardShadowBox';
import { useFriends, SearchResult } from '../state/friends';
import { avatarColor } from '../lib/avatarColor';

export default function FriendsScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { incoming, leaderboard, loading, search, sendRequest, respondRequest, removeFriend } = useFriends();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  const friends = leaderboard.filter((r) => !r.is_you);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setMessage(null);
    const found = await search(query.trim());
    setResults(found);
    setSearching(false);
  };

  const onAdd = async (id: string) => {
    const { error } = await sendRequest(id);
    if (error) {
      setMessage(error.includes('duplicate') ? t('friends_already_sent') : error);
    } else {
      setSentTo((prev) => ({ ...prev, [id]: true }));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink }}>←</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, letterSpacing: -0.4 }}>{t('friends_title')}</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            placeholder={t('friends_input_placeholder')}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 2, borderColor: colors.border, borderRadius: 12, fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}
          />
          <Pressable onPress={runSearch} style={{ paddingHorizontal: 18, justifyContent: 'center', backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            {searching ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>{t('friends_add')}</Text>}
          </Pressable>
        </View>
        {message && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted, marginTop: 6 }}>{message}</Text>}

        {results.length > 0 && (
          <View style={{ marginTop: 10, gap: 6 }}>
            {results.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
                <View style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: avatarColor(r.id), borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#1a1a1a' }}>{r.display_name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{r.display_name}</Text>
                <Pressable
                  onPress={() => onAdd(r.id)}
                  disabled={!!sentTo[r.id]}
                  style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: sentTo[r.id] ? colors.track : accent.blue, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}
                >
                  <Text style={{ fontFamily: fonts.display, fontSize: 10, color: sentTo[r.id] ? colors.muted : '#fff' }}>
                    {sentTo[r.id] ? t('friends_request_sent') : t('friends_add')}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {incoming.length > 0 && (
          <>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 8 }}>{t('friends_requests_header')}</Text>
            <View style={{ gap: 8, marginBottom: 18 }}>
              {incoming.map((req) => (
                <HardShadowBox key={req.friendship_id} bg={colors.card} radius={14} offset={3}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: avatarColor(req.requester_id), borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: fonts.display, fontSize: 15, color: '#1a1a1a' }}>{req.requester_name.slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{req.requester_name}</Text>
                    <Pressable onPress={() => respondRequest(req.friendship_id, true)} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: accent.mint, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
                      <Text style={{ fontFamily: fonts.display, fontSize: 10, color: '#1a1a1a' }}>{t('friends_accept')}</Text>
                    </Pressable>
                    <Pressable onPress={() => respondRequest(req.friendship_id, false)} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.track, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
                      <Text style={{ fontFamily: fonts.display, fontSize: 10, color: colors.muted }}>{t('friends_decline')}</Text>
                    </Pressable>
                  </View>
                </HardShadowBox>
              ))}
            </View>
          </>
        )}

        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 8 }}>
          {friends.length} {t('friends_list_header')}
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.muted} />
        ) : friends.length === 0 ? (
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted }}>{t('friends_none')}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {friends.map((f) => (
              <HardShadowBox key={f.id} bg={colors.card} radius={14} offset={3}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: avatarColor(f.id), borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: 15, color: '#1a1a1a' }}>{f.display_name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{f.display_name}</Text>
                    <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.muted }}>🔥 {f.current_streak} · {f.xp} XP</Text>
                  </View>
                  <Pressable onPress={() => removeFriend(f.id)} style={{ paddingVertical: 5, paddingHorizontal: 9, backgroundColor: colors.track, borderRadius: 999 }}>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>{t('friends_remove')}</Text>
                  </Pressable>
                </View>
              </HardShadowBox>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
