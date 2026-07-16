import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useAuth } from '../state/auth';
import { supabase } from '../lib/supabase';
import { usernameToEmail, usernameToSlug } from '../lib/username';

type Mode = 'signin' | 'signup' | 'forgot-email' | 'forgot-code';

export default function AuthScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const submitForgotEmail = async () => {
    setError(null);
    if (!forgotEmail.trim()) {
      setError(t('auth_forgot_error_no_email'));
      return;
    }
    setBusy(true);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
    setBusy(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setMode('forgot-code');
  };

  const submitResetCode = async () => {
    setError(null);
    if (!resetCode.trim()) {
      setError(t('auth_forgot_error_no_code'));
      return;
    }
    if (!newPassword) {
      setError(t('auth_error_missing'));
      return;
    }
    setBusy(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: forgotEmail.trim(),
      token: resetCode.trim(),
      type: 'recovery',
    });
    if (verifyError) {
      setBusy(false);
      setError(verifyError.message);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setResetDone(true);
  };

  const backToSignIn = () => {
    setMode('signin');
    setError(null);
    setResetDone(false);
    setForgotEmail('');
    setResetCode('');
    setNewPassword('');
  };

  const submit = async () => {
    setError(null);
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError(t('auth_error_missing'));
      return;
    }
    if (usernameToSlug(cleanUsername).length < 3) {
      setError(t('auth_error_username_short'));
      return;
    }
    setBusy(true);
    const email = usernameToEmail(cleanUsername);

    if (mode === 'signup') {
      const { data: taken, error: checkError } = await supabase.rpc('is_username_taken', {
        check_username: cleanUsername,
      });
      if (checkError) {
        setBusy(false);
        setError(checkError.message);
        return;
      }
      if (taken) {
        setBusy(false);
        setError(t('auth_error_username_taken'));
        return;
      }
    }

    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, cleanUsername);
    setBusy(false);
    if (result.error) setError(result.error);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: accent.coral, letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' }}>
          STRIKR
        </Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink, textAlign: 'center', marginTop: 6, letterSpacing: -0.5 }}>
          {mode === 'signin' && t('auth_title_signin')}
          {mode === 'signup' && t('auth_title_signup')}
          {(mode === 'forgot-email' || mode === 'forgot-code') && t('auth_forgot_title')}
        </Text>

        {(mode === 'signin' || mode === 'signup') && (
          <View style={{ marginTop: 24, gap: 10 }}>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder={t('auth_username')}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink,
                backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
                paddingVertical: 12, paddingHorizontal: 14,
              }}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth_password')}
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={{
                fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink,
                backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
                paddingVertical: 12, paddingHorizontal: 14,
              }}
            />

            {error && (
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: accent.wrongRed, textAlign: 'center' }}>{error}</Text>
            )}

            <Pressable
              onPress={submit}
              disabled={busy}
              style={{
                marginTop: 6, paddingVertical: 14, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border,
                borderRadius: 12, alignItems: 'center', opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontFamily: fonts.display, fontSize: 14, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {mode === 'signin' ? t('auth_signin') : t('auth_signup')}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} style={{ marginTop: 8, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted }}>
                {mode === 'signin' ? t('auth_switch_to_signup') : t('auth_switch_to_signin')}
              </Text>
            </Pressable>

            {mode === 'signin' && (
              <Pressable onPress={() => { setMode('forgot-email'); setError(null); }} style={{ marginTop: 2, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted }}>{t('auth_forgot_link')}</Text>
              </Pressable>
            )}
          </View>
        )}

        {mode === 'forgot-email' && (
          <View style={{ marginTop: 24, gap: 10 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 }}>
              {t('auth_forgot_intro')}
            </Text>
            <TextInput
              value={forgotEmail}
              onChangeText={setForgotEmail}
              placeholder={t('auth_forgot_email_placeholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={{
                fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink,
                backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
                paddingVertical: 12, paddingHorizontal: 14,
              }}
            />

            {error && (
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: accent.wrongRed, textAlign: 'center' }}>{error}</Text>
            )}

            <Pressable
              onPress={submitForgotEmail}
              disabled={busy}
              style={{
                marginTop: 6, paddingVertical: 14, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border,
                borderRadius: 12, alignItems: 'center', opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? <ActivityIndicator color="#fff" /> : (
                <Text style={{ fontFamily: fonts.display, fontSize: 14, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {t('auth_forgot_send')}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={backToSignIn} style={{ marginTop: 8, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted }}>{t('auth_forgot_back')}</Text>
            </Pressable>
          </View>
        )}

        {mode === 'forgot-code' && (
          <View style={{ marginTop: 24, gap: 10 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 }}>
              {resetDone ? t('auth_forgot_success') : t('auth_forgot_sent_intro')}
            </Text>
            {!resetDone && (
              <>
                <TextInput
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder={t('auth_forgot_code_placeholder')}
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={{
                    fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink,
                    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
                    paddingVertical: 12, paddingHorizontal: 14,
                  }}
                />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('auth_forgot_new_password_placeholder')}
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  style={{
                    fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink,
                    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
                    paddingVertical: 12, paddingHorizontal: 14,
                  }}
                />

                {error && (
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: accent.wrongRed, textAlign: 'center' }}>{error}</Text>
                )}

                <Pressable
                  onPress={submitResetCode}
                  disabled={busy}
                  style={{
                    marginTop: 6, paddingVertical: 14, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border,
                    borderRadius: 12, alignItems: 'center', opacity: busy ? 0.6 : 1,
                  }}
                >
                  {busy ? <ActivityIndicator color="#fff" /> : (
                    <Text style={{ fontFamily: fonts.display, fontSize: 14, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      {t('auth_forgot_submit')}
                    </Text>
                  )}
                </Pressable>

                <Pressable onPress={backToSignIn} style={{ marginTop: 8, alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted }}>{t('auth_forgot_back')}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
