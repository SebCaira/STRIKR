import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import HardShadowBox from '../components/HardShadowBox';
import { useLeagues } from '../state/leagues';

export default function LeaguesScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { leagues, loading, createLeague, joinByCode, leaveLeague } = useLeagues();

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const onCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setMessage(null);
    const { error } = await createLeague(newName.trim());
    setCreating(false);
    if (error) setMessage(error);
    else setNewName('');
  };

  const onJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setMessage(null);
    const { error } = await joinByCode(code.trim());
    setJoining(false);
    if (error) setMessage(t('leagues_error_invalid_code'));
    else setCode('');
  };

  const copyCode = async (leagueId: string, inviteCode: string) => {
    await Clipboard.setStringAsync(inviteCode);
    setCopiedId(leagueId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink }}>←</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, letterSpacing: -0.4 }}>{t('leagues_title')}</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder={t('leagues_create_placeholder')}
            placeholderTextColor={colors.muted}
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 2, borderColor: colors.border, borderRadius: 12, fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}
          />
          <Pressable onPress={onCreate} style={{ paddingHorizontal: 16, justifyContent: 'center', backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            {creating ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>{t('leagues_create')}</Text>}
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder={t('leagues_join_placeholder')}
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 2, borderColor: colors.border, borderRadius: 12, fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}
          />
          <Pressable onPress={onJoin} style={{ paddingHorizontal: 16, justifyContent: 'center', backgroundColor: accent.blue, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            {joining ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>{t('leagues_join')}</Text>}
          </Pressable>
        </View>

        {message && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>{message}</Text>}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 8 }}>
          {leagues.length} {t('leagues_list_header')}
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.muted} />
        ) : leagues.length === 0 ? (
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted }}>{t('leagues_none')}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {leagues.map((l) => (
              <HardShadowBox key={l.id} bg={colors.card} radius={14} offset={3}>
                <View style={{ padding: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 15, color: colors.ink }} numberOfLines={1}>
                      {l.name}
                    </Text>
                    {l.is_owner && (
                      <View style={{ paddingVertical: 3, paddingHorizontal: 8, backgroundColor: accent.yellow, borderRadius: 999 }}>
                        <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: '#1a1a1a' }}>{t('leagues_owner')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>
                    {l.member_count} {t('leagues_members')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.muted, borderStyle: 'dashed', borderRadius: 10 }}>
                      <Text style={{ fontSize: 14 }}>🔗</Text>
                      <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{l.invite_code}</Text>
                      <Pressable onPress={() => copyCode(l.id, l.invite_code)} style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: colors.border, borderRadius: 999 }}>
                        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.bg }}>{copiedId === l.id ? '✓' : t('friends_copy')}</Text>
                      </Pressable>
                    </View>
                    <Pressable onPress={() => leaveLeague(l.id)} style={{ paddingVertical: 8, paddingHorizontal: 10, backgroundColor: colors.track, borderRadius: 10 }}>
                      <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>{t('leagues_leave')}</Text>
                    </Pressable>
                  </View>
                </View>
              </HardShadowBox>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
