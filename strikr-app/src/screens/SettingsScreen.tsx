import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n, LANGS, LANG_LABELS, Lang } from '../i18n/i18n';
import { useSettings } from '../state/settings';
import { useAuth } from '../state/auth';
import { useAvatar } from '../state/avatar';
import { supabase } from '../lib/supabase';
import { isPlaceholderEmail } from '../lib/username';
import { requestNotificationPermission, scheduleDailyReminder, cancelDailyReminder } from '../lib/notifications';
import { friendlyError } from '../lib/errors';

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
  const { settings, setSoundEnabled, setHapticsEnabled, setNotificationsEnabled } = useSettings();
  const { user, signOut } = useAuth();
  const { avatarUrl } = useAvatar();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const username = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const hasRealEmail = !isPlaceholderEmail(user?.email);

  const onToggleNotifications = async (v: boolean) => {
    if (!v) {
      setNotificationsEnabled(false);
      await cancelDailyReminder();
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      setNotificationsEnabled(false);
      return;
    }
    setNotificationsEnabled(true);
    await scheduleDailyReminder(t('notif_reminder_title'), t('notif_reminder_body'));
  };

  const saveRecoveryEmail = async () => {
    if (!recoveryEmail.trim()) return;
    setRecoveryBusy(true);
    setRecoveryMessage(null);
    const { error } = await supabase.auth.updateUser({ email: recoveryEmail.trim() });
    setRecoveryBusy(false);
    setRecoveryMessage(error ? friendlyError(error, t('error_generic')) : t('auth_recovery_email_saved'));
  };

  const savePassword = async () => {
    if (!newPassword) return;
    setPasswordMessage(null);
    if (newPassword !== newPasswordConfirm) {
      setPasswordMessage(t('settings_password_mismatch'));
      return;
    }
    setPasswordBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);
    if (error) {
      setPasswordMessage(friendlyError(error, t('error_generic')));
      return;
    }
    setNewPassword('');
    setNewPasswordConfirm('');
    setPasswordMessage(t('settings_password_saved'));
  };

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
            <View style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: accent.yellow, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={{ fontFamily: fonts.display, fontSize: 14 }}>{username.slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{username}</Text>
            </View>
          </View>

          <View style={{ marginTop: 6, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, gap: 8 }}>
            {hasRealEmail ? (
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink }}>
                {t('auth_recovery_email_current_prefix')} {user?.email}
              </Text>
            ) : (
              <>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{t('auth_recovery_email_title')}</Text>
                <TextInput
                  value={recoveryEmail}
                  onChangeText={setRecoveryEmail}
                  placeholder={t('auth_recovery_email_placeholder')}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={{
                    fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink,
                    backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.border, borderRadius: 10,
                    paddingVertical: 9, paddingHorizontal: 12,
                  }}
                />
                <Pressable
                  onPress={saveRecoveryEmail}
                  disabled={recoveryBusy}
                  style={{ paddingVertical: 9, backgroundColor: accent.blue, borderRadius: 10, alignItems: 'center', opacity: recoveryBusy ? 0.6 : 1 }}
                >
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: '#fff' }}>{t('auth_recovery_email_save')}</Text>
                </Pressable>
                {recoveryMessage && (
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>{recoveryMessage}</Text>
                )}
              </>
            )}
          </View>

          <View style={{ marginTop: 6, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, gap: 8 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{t('settings_password_title')}</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('settings_password_new_placeholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={{
                fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink,
                backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.border, borderRadius: 10,
                paddingVertical: 9, paddingHorizontal: 12,
              }}
            />
            <TextInput
              value={newPasswordConfirm}
              onChangeText={setNewPasswordConfirm}
              placeholder={t('settings_password_confirm_placeholder')}
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={{
                fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink,
                backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.border, borderRadius: 10,
                paddingVertical: 9, paddingHorizontal: 12,
              }}
            />
            <Pressable
              onPress={savePassword}
              disabled={passwordBusy}
              style={{ paddingVertical: 9, backgroundColor: accent.blue, borderRadius: 10, alignItems: 'center', opacity: passwordBusy ? 0.6 : 1 }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: '#fff' }}>{t('settings_password_save')}</Text>
            </Pressable>
            {passwordMessage && (
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>{passwordMessage}</Text>
            )}
          </View>
        </View>

        <View>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1.4, marginBottom: 6 }}>{t('settings_prefs')}</Text>
          <View style={{ gap: 6 }}>
            <ToggleRow icon="🔔" label={t('settings_notif')} value={settings.notificationsEnabled} onChange={onToggleNotifications} />
            <ToggleRow icon="🔊" label={t('settings_sound')} value={settings.soundEnabled} onChange={setSoundEnabled} />
            <ToggleRow icon="📳" label={t('settings_haptics')} value={settings.hapticsEnabled} onChange={setHapticsEnabled} />

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
            <Pressable
              onPress={() => setHelpOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.displaySemibold, fontSize: 13, color: colors.ink }}>{t('settings_help')}</Text>
              <Text style={{ color: colors.muted }}>→</Text>
            </Pressable>
            <Pressable
              onPress={() => setLegalOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.displaySemibold, fontSize: 13, color: colors.ink }}>{t('settings_legal')}</Text>
              <Text style={{ color: colors.muted }}>→</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => signOut()}
          style={{ padding: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: accent.coral, borderRadius: 12, alignItems: 'center' }}
        >
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

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setHelpOpen(false)}>
          <View style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: colors.border, borderRadius: 20, padding: 22, maxWidth: 340, width: '100%' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginBottom: 12 }}>{t('settings_help_title')}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 19 }}>{t('settings_help_body')}</Text>
            </ScrollView>
            <Pressable onPress={() => setHelpOpen(false)} style={{ marginTop: 18, paddingVertical: 10, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('settings_help_close')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={legalOpen} transparent animationType="fade" onRequestClose={() => setLegalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setLegalOpen(false)}>
          <View style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: colors.border, borderRadius: 20, padding: 22, maxWidth: 340, width: '100%' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginBottom: 12 }}>{t('settings_legal_title')}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 19 }}>{t('settings_legal_body')}</Text>
            </ScrollView>
            <Pressable onPress={() => setLegalOpen(false)} style={{ marginTop: 18, paddingVertical: 10, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('settings_legal_close')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
