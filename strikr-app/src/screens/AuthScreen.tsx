import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useAuth } from '../state/auth';

export default function AuthScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError(t('auth_error_missing'));
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      setError(t('auth_error_missing'));
      return;
    }
    setBusy(true);
    const result =
      mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName.trim());
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
          {mode === 'signin' ? t('auth_title_signin') : t('auth_title_signup')}
        </Text>

        <View style={{ marginTop: 24, gap: 10 }}>
          {mode === 'signup' && (
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('auth_display_name')}
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              style={{
                fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink,
                backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12,
                paddingVertical: 12, paddingHorizontal: 14,
              }}
            />
          )}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth_email')}
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
