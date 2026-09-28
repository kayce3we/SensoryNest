import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { LogoMark } from '@/components/ui/LogoMark';
import { supabase } from '@/lib/supabase';

export default function AuthConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token_hash, type } = useLocalSearchParams<{ token_hash: string; type: string }>();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function verify() {
      if (!token_hash) { setStatus('error'); setErrorMsg('Invalid confirmation link.'); return; }
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: (type as any) ?? 'email',
      });
      if (error) { setStatus('error'); setErrorMsg(error.message); }
      else setStatus('success');
    }
    verify();
  }, [token_hash, type]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40 }]}>
      <View style={styles.logoArea}>
        <LogoMark size={52} />
        <Text style={styles.wordmark}>SensoryNest</Text>
      </View>

      <View style={styles.card}>
        {status === 'verifying' && (
          <>
            <ActivityIndicator color={Colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.cardTitle}>Verifying…</Text>
            <Text style={styles.desc}>Confirming your account, just a moment.</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <Text style={styles.cardTitle}>Email confirmed!</Text>
            <Text style={styles.desc}>Your account is ready. Sign in to get started.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/login')} activeOpacity={0.85}>
              <Text style={styles.btnText}>Go to sign in</Text>
            </TouchableOpacity>
          </>
        )}
        {status === 'error' && (
          <>
            <Text style={styles.cardTitle}>Verification failed</Text>
            <Text style={styles.desc}>{errorMsg || 'This link may have expired. Please try signing up again.'}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/login')} activeOpacity={0.85}>
              <Text style={styles.btnText}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 24 },
  logoArea: { alignItems: 'center', marginBottom: 36 },
  wordmark: { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5, marginTop: 12, fontFamily: 'PlayfairDisplay_700Bold' },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cardTitle: { fontSize: 20, fontWeight: '600', color: Colors.text, marginBottom: 8, fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center' },
  desc: { fontSize: 13, color: Colors.textMid, lineHeight: 20, marginBottom: 24, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
  btn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
