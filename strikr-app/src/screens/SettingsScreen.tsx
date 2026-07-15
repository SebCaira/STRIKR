import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n, LANGS, LANG_LABELS, Lang } from '../i18n/i18n';

function ToggleRow({ icon, label, value, onChange }: { icon: string; label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors, accent } = useTheme();
  const { fonts } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}
    >
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{label}</Text>
      <View style={{ width: 42, height: 24, borderRadius: 999, backgroundColor: value ? accent.mint : colors.track, borderWidth: 2, borderColor: colors.border, justifyContent: 'center' }}>
        <View style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: colors.border, marginLeft: value ? 22 : 2 }} />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors, accent, fonts, dark, setDark } = useTheme();
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [notif, setNotif] = useState(true);
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink }}>←</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, letterSpacing: -0.4 }}>{t('settings_title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 6 }}>{t('settings_account')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: accent.yellow, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 14 }}>V</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{t('league_you')}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted }}>{t('settings_connected_via')}</Text>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 11, color: accent.coral }}>{t('settings_edit')}</Text>
          </View>
        </View>

        <View>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 6 }}>{t('settings_prefs')}</Text>
          <View style={{ gap: 6 }}>
            <ToggleRow icon="🔔" label={t('settings_notif')} value={notif} onChange={setNotif} />
            <ToggleRow icon="🔊" label={t('settings_sound')} value={sound} onChange={setSound} />
            <ToggleRow icon="📳" label={t('settings_haptics')} value={haptics} onChange={setHaptics} />

            <Pressable
              onPress={() => setLangMenuOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}
            >
              <Text style={{ fontSize: 18 }}>🌐</Text>
              <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{t('settings_language')}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted }}>{LANG_LABELS[lang]} ▾</Text>
            </Pressable>

            <Pressable
              onPress={() => setDark(!dark)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}
            >
              <Text style={{ fontSize: 18 }}>🌙</Text>
              <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{t('settings_dark_mode')}</Text>
              <View style={{ width: 42, height: 24, borderRadius: 999, backgroundColor: dark ? accent.mint : colors.track, borderWidth: 2, borderColor: colors.border, justifyContent: 'center' }}>
                <View style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: colors.border, marginLeft: dark ? 22 : 2 }} />
              </View>
            </Pressable>
          </View>
        </View>

        <View>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 6 }}>{t('settings_support')}</Text>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <Text style={{ flex: 1, fontFamily: fonts.displaySemibold, fontSize: 13, color: colors.ink }}>{t('settings_help')}</Text>
              <Text style={{ color: colors.muted }}>→</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <Text style={{ flex: 1, fontFamily: fonts.displaySemibold, fontSize: 13, color: colors.ink }}>{t('settings_legal')}</Text>
              <Text style={{ color: colors.muted }}>→</Text>
            </View>
          </View>
        </View>

        <Pressable style={{ padding: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: accent.coral, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: accent.coral }}>{t('settings_logout')}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={langMenuOpen} transparent animationType="fade" onRequestClose={() => setLangMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'center', padding: 24 }} onPress={() => setLangMenuOpen(false)}>
          <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
            {LANGS.map((l: Lang) => (
              <Pressable
                key={l}
                onPress={() => {
                  setLang(l);
                  setLangMenuOpen(false);
                }}
                style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                  padding: 14, backgroundColor: l === lang ? accent.yellow : colors.card,
                  borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.08)',
                }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{LANG_LABELS[l]}</Text>
                {l === lang && <Text style={{ color: colors.ink }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
