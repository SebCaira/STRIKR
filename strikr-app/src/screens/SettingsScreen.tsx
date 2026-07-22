import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeContext';
import { useI18n, LANGS, LANG_LABELS, Lang } from '../i18n/i18n';
import { useSettings } from '../state/settings';
import { useAuth } from '../state/auth';
import { useAvatar } from '../state/avatar';
import { useDiamonds } from '../state/diamonds';
import { supabase } from '../lib/supabase';
import { isPlaceholderEmail } from '../lib/username';
import { requestNotificationPermission, scheduleDailyReminder, cancelDailyReminder } from '../lib/notifications';
import { friendlyError } from '../lib/errors';
import { AVATAR_FRAMES } from '../data/avatarFrames';
import AvatarFrame from '../components/AvatarFrame';

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
  const { avatarUrl, ownedFrames, equippedFrame, buyFrame, equipFrame } = useAvatar();
  const [frameMessage, setFrameMessage] = useState<string | null>(null);
  const { syncLocalDelta } = useDiamonds();
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
  const [newUsername, setNewUsername] = useState('');
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralMessage, setReferralMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const username = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const hasRealEmail = !isPlaceholderEmail(user?.email);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('referral_code, referred_by')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setReferralCode(data?.referral_code ?? null);
        setReferredBy(data?.referred_by ?? null);
      });
  }, [user]);

  const copyReferralCode = async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 1500);
  };

  const redeemReferralCode = async () => {
    const code = referralInput.trim();
    if (!code) return;
    setReferralBusy(true);
    setReferralMessage(null);
    const { error } = await supabase.rpc('redeem_referral_code', { code_arg: code });
    setReferralBusy(false);
    if (error) {
      const reason =
        error.message.includes('own_code') ? t('settings_referral_error_own') :
        error.message.includes('already_redeemed') ? t('settings_referral_error_used') :
        t('settings_referral_error_invalid');
      setReferralMessage(reason);
      return;
    }
    syncLocalDelta(200);
    setReferredBy('me');
    setReferralInput('');
    setReferralMessage(t('settings_referral_redeemed'));
  };

  const deleteAccount = async () => {
    setDeleteBusy(true);
    setDeleteError(null);
    const { error } = await supabase.rpc('delete_account');
    if (error) {
      setDeleteBusy(false);
      setDeleteError(t('settings_delete_account_error'));
      return;
    }
    await supabase.auth.signOut().catch(() => {});
    setDeleteBusy(false);
    setDeleteConfirmOpen(false);
  };

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

  const saveUsername = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed) return;
    setUsernameMessage(null);
    if (trimmed.length < 3) {
      setUsernameMessage(t('auth_error_username_short'));
      return;
    }
    setUsernameBusy(true);
    if (trimmed.toLowerCase() !== username.toLowerCase()) {
      const { data: taken } = await supabase.rpc('is_username_taken', { check_username: trimmed });
      if (taken) {
        setUsernameBusy(false);
        setUsernameMessage(t('auth_error_username_taken'));
        return;
      }
    }
    const { error: metaError } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
    if (!metaError && user) {
      await supabase.from('profiles').update({ display_name: trimmed }).eq('id', user.id);
    }
    setUsernameBusy(false);
    if (metaError) {
      setUsernameMessage(friendlyError(metaError, t('error_generic')));
      return;
    }
    setNewUsername('');
    setUsernameMessage(t('settings_username_saved'));
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
            <AvatarFrame frameId={equippedFrame} size={36}>
              <View style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: accent.yellow, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ fontFamily: fonts.display, fontSize: 14 }}>{username.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
            </AvatarFrame>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{username}</Text>
            </View>
          </View>

          <View style={{ marginTop: 6, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, gap: 8 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{t('settings_frames_title')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              <Pressable onPress={() => equipFrame(null)} style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 52, height: 52, borderRadius: 999, backgroundColor: colors.bg, borderWidth: 2, borderColor: equippedFrame === null ? accent.coral : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 11, color: colors.muted }}>{t('settings_frames_none')}</Text>
                </View>
              </Pressable>
              {AVATAR_FRAMES.map((f) => {
                const owned = ownedFrames.includes(f.id);
                const equipped = equippedFrame === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => {
                      if (owned) {
                        equipFrame(f.id);
                        return;
                      }
                      const { error } = buyFrame(f.id);
                      if (error === 'not_enough_diamonds') setFrameMessage(t('settings_frames_not_enough'));
                    }}
                    style={{ alignItems: 'center', gap: 4 }}
                  >
                    <AvatarFrame frameId={f.id} size={44}>
                      <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: colors.card, borderWidth: equipped ? 2 : 0, borderColor: accent.coral, alignItems: 'center', justifyContent: 'center' }}>
                        {!owned && <Text style={{ fontSize: 14 }}>🔒</Text>}
                      </View>
                    </AvatarFrame>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 8, color: colors.muted }}>{owned ? t(f.labelKey) : `💎${f.cost}`}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {frameMessage && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>{frameMessage}</Text>}
          </View>

          <View style={{ marginTop: 6, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, gap: 8 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{t('settings_username_title')}</Text>
            <TextInput
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder={username || t('settings_username_placeholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink,
                backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.border, borderRadius: 10,
                paddingVertical: 9, paddingHorizontal: 12,
              }}
            />
            <Pressable
              onPress={saveUsername}
              disabled={usernameBusy}
              style={{ paddingVertical: 9, backgroundColor: accent.blue, borderRadius: 10, alignItems: 'center', opacity: usernameBusy ? 0.6 : 1 }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: '#fff' }}>{t('settings_username_save')}</Text>
            </Pressable>
            {usernameMessage && (
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>{usernameMessage}</Text>
            )}
          </View>

          <View style={{ marginTop: 6, padding: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, gap: 8 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>{t('settings_referral_title')}</Text>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted, lineHeight: 15 }}>{t('settings_referral_subtitle')}</Text>
            {referralCode && (
              <Pressable
                onPress={copyReferralCode}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.muted, borderStyle: 'dashed', borderRadius: 10 }}
              >
                <Text style={{ fontSize: 14 }}>🔗</Text>
                <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink, letterSpacing: 2 }}>{referralCode}</Text>
                <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: colors.border, borderRadius: 999 }}>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.bg }}>{referralCopied ? '✓' : t('friends_copy')}</Text>
                </View>
              </Pressable>
            )}
            {!referredBy && (
              <>
                <TextInput
                  value={referralInput}
                  onChangeText={setReferralInput}
                  placeholder={t('settings_referral_input_placeholder')}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={{
                    fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink,
                    backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.border, borderRadius: 10,
                    paddingVertical: 9, paddingHorizontal: 12,
                  }}
                />
                <Pressable
                  onPress={redeemReferralCode}
                  disabled={referralBusy}
                  style={{ paddingVertical: 9, backgroundColor: accent.blue, borderRadius: 10, alignItems: 'center', opacity: referralBusy ? 0.6 : 1 }}
                >
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: '#fff' }}>{t('settings_referral_redeem')}</Text>
                </Pressable>
              </>
            )}
            {referralMessage && (
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted }}>{referralMessage}</Text>
            )}
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

        <Pressable
          onPress={() => {
            setDeleteError(null);
            setDeleteConfirmOpen(true);
          }}
          style={{ padding: 12, alignItems: 'center' }}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted, textDecorationLine: 'underline' }}>
            {t('settings_delete_account')}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal visible={deleteConfirmOpen} transparent animationType="fade" onRequestClose={() => setDeleteConfirmOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => !deleteBusy && setDeleteConfirmOpen(false)}>
          <Pressable style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: accent.coral, borderRadius: 20, padding: 22, maxWidth: 340, width: '100%' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginBottom: 10 }}>{t('settings_delete_account_confirm_title')}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 19 }}>{t('settings_delete_account_confirm_body')}</Text>
            {deleteError && (
              <Text style={{ marginTop: 10, fontFamily: fonts.bodySemibold, fontSize: 12, color: accent.coral }}>{deleteError}</Text>
            )}
            <Pressable
              onPress={deleteAccount}
              disabled={deleteBusy}
              style={{ marginTop: 18, paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center', opacity: deleteBusy ? 0.6 : 1 }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>
                {deleteBusy ? '…' : t('settings_delete_account_confirm_button')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDeleteConfirmOpen(false)}
              disabled={deleteBusy}
              style={{ marginTop: 10, paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted }}>{t('settings_delete_account_cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
