import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/theme';
import { LogoMark } from '@/components/ui/LogoMark';
import { supabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/auth';
import * as Linking from 'expo-linking';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_code?: string; email?: string; token?: string }>();
  const url = Linking.useURL();
  const processed = useRef(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Primary: PKCE code arrives as a query param (Expo Router preserves these)
  useEffect(() => {
    if (processed.current) return;
    if (params.error || params.error_code) {
      processed.current = true;
      setLinkError('This reset link has expired. Please request a new one.');
      return;
    }
    if (params.code) {
      processed.current = true;
      supabase.auth.exchangeCodeForSession(params.code).then(({ error: err }) => {
        if (!err) setSessionReady(true);
        else setLinkError('Invalid or expired reset link. Please request a new one.');
      });
    }
  }, [params.code, params.error, params.error_code]);

  // OTP code flow: email + token passed from login screen
  useEffect(() => {
    if (!params.email || !params.token || processed.current) return;
    processed.current = true;
    supabase.auth.verifyOtp({ email: params.email, token: params.token, type: 'email' })
      .then(({ error: err }) => {
        if (!err) setSessionReady(true);
        else setLinkError('Invalid or expired code. Please go back and try again.');
      });
  }, [params.email, params.token]);

  // Fallback: catch hash-based tokens/errors via Linking.useURL()
  useEffect(() => {
    if (!url || processed.current) return;

    async function process() {
      const hash = url!.split('#')[1] ?? '';
      const hashParams = new URLSearchParams(hash);

      if (hashParams.get('error')) {
        processed.current = true;
        setLinkError('This reset link has expired. Please request a new one.');
        return;
      }

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      if (accessToken && refreshToken && type === 'recovery') {
        processed.current = true;
        const { error: err } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (!err) setSessionReady(true);
        else setLinkError('Invalid or expired reset link. Please request a new one.');
      }
    }

    process();
  }, [url]);

  // Timeout: never hang forever
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!sessionReady && !linkError) {
        setLinkError('This reset link has expired or is invalid. Please request a new one.');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [sessionReady, linkError]);

  useEffect(() => {
    // Session is established before navigating here (via OTP verify)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { processed.current = true; setSessionReady(true); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        processed.current = true;
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleReset() {
    if (!password) { setError('Please enter a new password.'); return; }
    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setError('');
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + 40 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoArea}>
        <LogoMark size={52} />
        <Text style={styles.wordmark}>SensoryNest</Text>
      </View>

      <View style={styles.card}>
        {done ? (
          <>
            <Text style={styles.cardTitle}>Password updated</Text>
            <Text style={styles.desc}>Your password has been changed. You can now sign in with your new password.</Text>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => router.replace('/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Go to sign in</Text>
            </TouchableOpacity>
          </>
        ) : linkError && !sessionReady ? (
          <>
            <Text style={styles.cardTitle}>Code invalid</Text>
            <Text style={styles.desc}>{linkError}</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={() => router.replace('/login')} activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        ) : !sessionReady ? (
          <>
            <Text style={styles.cardTitle}>Verifying link…</Text>
            <Text style={styles.desc}>Please wait while we verify your reset link.</Text>
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Set new password</Text>
            <Text style={styles.desc}>Choose a new password. At least 6 characters, with uppercase, lowercase, and a number.</Text>

            <Text style={styles.label}>New password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSoft}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)} activeOpacity={0.7}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  {showPassword ? (
                    <>
                      <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
                      <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
                      <Path d="M1 1l22 22" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
                    </>
                  ) : (
                    <>
                      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
                      <Path d="M12 9a3 3 0 100 6 3 3 0 000-6z" stroke={Colors.textSoft} strokeWidth="1.8" />
                    </>
                  )}
                </Svg>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              style={[styles.input, confirmPassword && password !== confirmPassword && styles.inputError]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.textSoft}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            {confirmPassword && password !== confirmPassword && (
              <Text style={styles.errorText}>Passwords don't match</Text>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>{loading ? 'Updating…' : 'Update password'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 24 },
  logoArea: { alignItems: 'center', marginBottom: 36 },
  wordmark: { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5, marginTop: 12, fontFamily: 'PlayfairDisplay_700Bold' },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 20, fontWeight: '600', color: Colors.text, marginBottom: 8, fontFamily: 'PlayfairDisplay_600SemiBold' },
  desc: { fontSize: 13, color: Colors.textMid, lineHeight: 20, marginBottom: 20, fontFamily: 'PlusJakartaSans_400Regular' },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textMid, marginBottom: 6, fontFamily: 'PlusJakartaSans_600SemiBold' },
  input: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, marginBottom: 16, fontFamily: 'PlusJakartaSans_400Regular' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  inputFlex: { flex: 1, marginBottom: 0 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 12, marginLeft: -44 },
  inputError: { borderColor: '#E57373' },
  errorText: { fontSize: 12, color: '#E57373', marginTop: -12, marginBottom: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
