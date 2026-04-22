import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { LogoMark } from '@/components/ui/LogoMark';
import { signIn, signUp } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        Alert.alert('Check your email', 'We sent you a confirmation link.');
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
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={Colors.textSoft}
          secureTextEntry
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />

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

        <TouchableOpacity onPress={() => setMode(m => m === 'signin' ? 'signup' : 'signin')} style={styles.switchRow}>
          <Text style={styles.switchText}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.switchLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </TouchableOpacity>
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
});
