import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import HardShadowBox from '../components/HardShadowBox';

const FRIENDS = [
  { name: 'Yanis', initial: 'Y', bg: '#ffe66b', fg: '#1a1a1a', detail: '🔥 8 · a trouvé en 1 essai · 2 min', online: true },
  { name: 'Théo', initial: 'T', bg: '#2a6f4d', fg: '#fff', detail: '🔥 3 · badge débloqué · 1h', online: false },
  { name: 'Sofia', initial: 'S', bg: '#7a2b52', fg: '#fff', detail: '🔥 12 · hors ligne · hier', online: false },
];

export default function FriendsScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

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
            value={code}
            onChangeText={setCode}
            placeholder={t('friends_input_placeholder')}
            placeholderTextColor={colors.muted}
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 2, borderColor: colors.border, borderRadius: 12, fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}
          />
          <Pressable style={{ paddingHorizontal: 18, justifyContent: 'center', backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#fff' }}>{t('friends_add')}</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.muted, borderStyle: 'dashed', borderRadius: 12 }}>
          <Text style={{ fontSize: 18 }}>🔗</Text>
          <Text style={{ flex: 1, fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>
            {t('friends_your_code')} <Text style={{ color: colors.ink, fontFamily: fonts.displayBold }}>STRIKR-V0US7</Text>
          </Text>
          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync('STRIKR-V0US7');
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            style={{ paddingVertical: 5, paddingHorizontal: 10, backgroundColor: colors.border, borderRadius: 999 }}
          >
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.bg }}>{copied ? '✓' : t('friends_copy')}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 8 }}>3 {t('friends_list_header')}</Text>
        <View style={{ gap: 8 }}>
          {FRIENDS.map((f) => (
            <HardShadowBox key={f.name} bg={colors.card} radius={14} offset={3}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: f.bg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 15, color: f.fg }}>{f.initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{f.name}</Text>
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.muted }}>{f.detail}</Text>
                </View>
                <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: f.online ? accent.mint : 'rgba(0,0,0,.15)', borderWidth: 1.5, borderColor: colors.border }} />
              </View>
            </HardShadowBox>
          ))}
        </View>

        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginVertical: 18 }}>{t('friends_suggestions')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: 'rgba(0,0,0,.12)', borderRadius: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: accent.lightBlue, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.ink }}>M</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>Maëlys</Text>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.muted }}>2 {t('friends_common')}</Text>
          </View>
          <Pressable style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 10, color: colors.ink }}>{t('friends_add')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
