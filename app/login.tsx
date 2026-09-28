import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Colors } from '@/constants/theme';
import { LogoMark } from '@/components/ui/LogoMark';
import { signIn, signUp, signInWithGoogle, signInWithApple, sendResetCode, verifySignupCode, resendSignupCode, validatePassword } from '@/lib/auth';
import { PRIVACY_POLICY_URL } from '@/constants/links';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'verify-code' | 'verify-signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function handleGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.message !== 'User cancelled') Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (mode === 'forgot') {
      if (!email) { Alert.alert('Missing email', 'Please enter your email address.'); return; }
      setLoading(true);
      try {
        await sendResetCode(email);
        setOtpCode('');
        setOtpError('');
        setMode('verify-code');
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (mode === 'signup') {
      const pwError = validatePassword(password);
      if (pwError) { setPasswordError(pwError); return; }
      if (password !== confirmPassword) {
        Alert.alert('Passwords don\'t match', 'Please make sure both passwords are the same.');
        return;
      }
    }
    setPasswordError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setOtpCode('');
        setOtpError('');
        setMode('verify-signup');
      } else {
        await signIn(email, password);
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
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
        <Text style={styles.tagline}>Your child's sensory diet, simplified.</Text>
      </View>

      <View style={styles.card}>
        {mode === 'verify-signup' ? (
          <>
            <Text style={styles.cardTitle}>Enter your code</Text>
            <Text style={styles.forgotDesc}>
              We sent a 6-digit code to{' '}
              <Text style={{ color: Colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{email}</Text>.
              {'\n'}Enter it below to activate your account.
            </Text>
            <Text style={styles.label}>6-digit code</Text>
            <TextInput
              style={styles.input}
              value={otpCode}
              onChangeText={v => { setOtpCode(v.replace(/[^0-9]/g, '')); setOtpError(''); }}
              placeholder="123456"
              placeholderTextColor={Colors.textSoft}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
            <TouchableOpacity
              style={[styles.submitBtn, (loading || otpCode.length < 6) && { opacity: 0.6 }]}
              disabled={loading || otpCode.length < 6}
              onPress={async () => {
                setLoading(true);
                try {
                  await verifySignupCode(email, otpCode);
                  router.replace('/(tabs)');
                } catch {
                  setOtpError('Invalid code. Please check and try again.');
                } finally {
                  setLoading(false);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>{loading ? 'Verifying…' : 'Verify code'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchRow}
              onPress={async () => {
                try { await resendSignupCode(email); setOtpCode(''); setOtpError(''); } catch {}
              }}
            >
              <Text style={styles.switchText}>Didn't get a code? <Text style={styles.switchLink}>Resend</Text></Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setMode('signup'); setOtpCode(''); setOtpError(''); }} style={styles.switchRow}>
              <Text style={styles.switchText}><Text style={styles.switchLink}>← Change email</Text></Text>
            </TouchableOpacity>
          </>
        ) : mode === 'verify-code' ? (
          <>
            <Text style={styles.cardTitle}>Enter your code</Text>
            <Text style={styles.forgotDesc}>
              We sent a 6-digit code to{' '}
              <Text style={{ color: Colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{email}</Text>.
              {'\n'}Enter it below to set a new password.
            </Text>
            <Text style={styles.label}>6-digit code</Text>
            <TextInput
              style={styles.input}
              value={otpCode}
              onChangeText={v => { setOtpCode(v.replace(/[^0-9]/g, '')); setOtpError(''); }}
              placeholder="123456"
              placeholderTextColor={Colors.textSoft}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
            <TouchableOpacity
              style={[styles.submitBtn, otpCode.length < 6 && { opacity: 0.6 }]}
              disabled={otpCode.length < 6}
              onPress={() => {
                router.push({ pathname: '/reset-password', params: { email, token: otpCode } });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Verify code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchRow}
              onPress={async () => {
                setLoading(true);
                try { await sendResetCode(email); setOtpCode(''); setOtpError(''); } catch {}
                setLoading(false);
              }}
            >
              <Text style={styles.switchText}>Didn't get a code? <Text style={styles.switchLink}>Resend</Text></Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('forgot')} style={styles.switchRow}>
              <Text style={styles.switchText}><Text style={styles.switchLink}>← Change email</Text></Text>
            </TouchableOpacity>
          </>
        ) : mode === 'forgot' ? (

          resetSent ? (
            <>
              <Text style={styles.cardTitle}>Check your email</Text>
              <Text style={styles.forgotDesc}>
                We sent a password reset link to{' '}
                <Text style={{ color: Colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{email}</Text>.
                Tap the link in that email to set a new password.
              </Text>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => { setMode('signin'); setResetSent(false); }}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Back to sign in</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Reset password</Text>
              <Text style={styles.forgotDesc}>Enter your email and we'll send you a code to reset your password.</Text>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textSoft}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>{loading ? 'Sending…' : 'Send code'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('signin')} style={styles.switchRow}>
                <Text style={styles.switchText}>
                  <Text style={styles.switchLink}>← Back to sign in</Text>
                </Text>
              </TouchableOpacity>
            </>
          )
        ) : (
          <>
            <Text style={styles.cardTitle}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textSoft}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={password}
                onChangeText={v => { setPassword(v); setPasswordError(''); }}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSoft}
                secureTextEntry={!showPassword}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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

            {mode === 'signup' && (
              passwordError
                ? <Text style={styles.errorText}>{passwordError}</Text>
                : <Text style={styles.passwordHint}>At least 6 characters, with an uppercase letter, a lowercase letter, and a number.</Text>
            )}

            {mode === 'signin' && (
              <TouchableOpacity onPress={() => { setMode('forgot'); setResetSent(false); }} style={styles.forgotRow}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {mode === 'signup' && (
              <>
                <Text style={styles.label}>Confirm password</Text>
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
              </>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            </TouchableOpacity>

            {mode === 'signup' && (
              <Text style={styles.legalText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                  Privacy Policy
                </Text>.
              </Text>
            )}

            <TouchableOpacity onPress={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setConfirmPassword(''); setShowPassword(false); }} style={styles.switchRow}>
              <Text style={styles.switchText}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={[styles.ssoBtn, loading && { opacity: 0.6 }]} onPress={handleGoogle} disabled={loading} activeOpacity={0.85}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </Svg>
              <Text style={styles.ssoBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.appleBtn}
                onPress={handleApple}
              />
            )}

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
  tagline: { fontSize: 14, color: Colors.textMid, marginTop: 6, fontFamily: 'PlusJakartaSans_400Regular' },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 20, fontWeight: '600', color: Colors.text, marginBottom: 20, fontFamily: 'PlayfairDisplay_600SemiBold' },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textMid, marginBottom: 6, fontFamily: 'PlusJakartaSans_600SemiBold' },
  input: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, marginBottom: 16, fontFamily: 'PlusJakartaSans_400Regular' },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  switchRow: { alignItems: 'center', marginTop: 16 },
  switchText: { fontSize: 13, color: Colors.textMid, fontFamily: 'PlusJakartaSans_400Regular' },
  switchLink: { color: Colors.primary, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  ssoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.bg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 13, marginBottom: 10 },
  appleBtn: { height: 46, marginTop: -2 },
  ssoBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text, fontFamily: 'PlusJakartaSans_600SemiBold' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  inputFlex: { flex: 1, marginBottom: 0 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 12, marginLeft: -44 },
  inputError: { borderColor: '#E57373' },
  errorText: { fontSize: 12, color: '#E57373', marginTop: -12, marginBottom: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  passwordHint: { fontSize: 11, color: Colors.textSoft, lineHeight: 16, marginTop: -12, marginBottom: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  forgotRow: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 16 },
  forgotLink: { fontSize: 12, color: Colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  forgotDesc: { fontSize: 13, color: Colors.textMid, lineHeight: 20, marginBottom: 20, fontFamily: 'PlusJakartaSans_400Regular' },
  legalText: { fontSize: 11, color: Colors.textSoft, lineHeight: 16, textAlign: 'center', marginTop: 10, fontFamily: 'PlusJakartaSans_400Regular' },
  legalLink: { color: Colors.primary, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
