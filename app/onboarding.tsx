import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/constants/theme';
import { LogoMark } from '@/components/ui/LogoMark';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const AGES = Array.from({ length: 16 }, (_, i) => i + 2);

const HOW_IT_WORKS = [
  {
    icon: (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={Colors.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M14 2v6h6M12 18v-6M9 15h6" stroke={Colors.primary} strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
    ),
    title: 'Upload your home program',
    desc: "Snap a photo or upload the PDF your OT gave you. We'll extract the activities automatically.",
  },
  {
    icon: (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path d="M9 11l3 3L22 4" stroke={Colors.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={Colors.primary} strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
    ),
    title: 'Complete daily activities',
    desc: 'Follow your child\'s sensory diet each day. Mark activities done as you go.',
  },
  {
    icon: (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path d="M18 20V10M12 20V4M6 20v-6" stroke={Colors.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
    title: 'Track progress',
    desc: 'See completion trends by sensory system and share reports directly with your OT.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [step, setStep] = useState(0);
  const [childName, setChildName] = useState('');
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveAndContinue() {
    if (!userId) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        child_name: childName.trim() || null,
        child_age: selectedAge,
      }).eq('id', userId);
    } catch {}
    setSaving(false);
    setStep(2);
  }

  function finish(goToUpload: boolean) {
    router.replace(goToUpload ? '/(tabs)/upload' : '/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Step dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.dot, step === i && styles.dotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.logoArea}>
              <LogoMark size={64} />
              <Text style={styles.wordmark}>SensoryNest</Text>
              <Text style={styles.tagline}>Your child's sensory diet, simplified.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome</Text>
              <Text style={styles.cardSub}>
                SensoryNest helps you follow your OT's home program, turning it into a daily routine you can actually keep up with.
              </Text>

              <View style={styles.featureList}>
                {HOW_IT_WORKS.map((item, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={styles.featureIcon}>{item.icon}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureTitle}>{item.title}</Text>
                      <Text style={styles.featureDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(1)} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Get started</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Step 1: About your child ── */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.logoArea}>
              <LogoMark size={52} />
              <Text style={styles.wordmark}>SensoryNest</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>About your child</Text>
              <Text style={styles.cardSub}>This helps us personalize the experience for your family.</Text>

              <Text style={styles.label}>Child's name</Text>
              <TextInput
                style={styles.input}
                value={childName}
                onChangeText={setChildName}
                placeholder="e.g. Liam"
                placeholderTextColor={Colors.textSoft}
                autoCapitalize="words"
                autoFocus
              />

              <Text style={styles.label}>Child's age <Text style={styles.optional}>(optional)</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ageRow}>
                {AGES.map(age => (
                  <TouchableOpacity
                    key={age}
                    style={[styles.ageChip, selectedAge === age && styles.ageChipActive]}
                    onPress={() => setSelectedAge(a => a === age ? null : age)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.ageChipText, selectedAge === age && styles.ageChipTextActive]}>{age}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.primaryBtn, (!childName.trim() || saving) && { opacity: 0.5 }]}
                onPress={saveAndContinue}
                disabled={!childName.trim() || saving}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Continue'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setChildName('My child'); saveAndContinue(); }} style={styles.skipRow} activeOpacity={0.7}>
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Step 2: First action ── */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.logoArea}>
              <LogoMark size={52} />
              <Text style={styles.wordmark}>SensoryNest</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.checkCircle}>
                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="12" r="10" fill={Colors.light} />
                  <Path d="M8 12l3 3 5-5" stroke={Colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>

              <Text style={styles.cardTitle}>You're all set{childName && childName !== 'My child' ? `, ${childName.split(' ')[0]}` : ''}!</Text>
              <Text style={styles.cardSub}>
                The best first step is uploading your child's home program. We'll turn it into a daily activity list automatically.
              </Text>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => finish(true)} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Upload home program</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => finish(false)} style={styles.skipRow} activeOpacity={0.7}>
                <Text style={styles.skipText}>I'll explore first</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 16, paddingBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 20, backgroundColor: Colors.primary },
  content: { paddingHorizontal: 24, paddingBottom: 48 },
  stepContainer: { paddingTop: 12 },
  logoArea: { alignItems: 'center', marginBottom: 28 },
  wordmark: { fontSize: 26, fontWeight: '700', color: Colors.text, letterSpacing: -0.5, marginTop: 10, fontFamily: 'PlayfairDisplay_700Bold' },
  tagline: { fontSize: 13, color: Colors.textMid, marginTop: 6, fontFamily: 'PlusJakartaSans_400Regular' },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 8, fontFamily: 'PlayfairDisplay_700Bold' },
  cardSub: { fontSize: 13, color: Colors.textMid, lineHeight: 20, marginBottom: 24, fontFamily: 'PlusJakartaSans_400Regular' },
  featureList: { gap: 20, marginBottom: 28 },
  featureRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  featureIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.light, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 3, fontFamily: 'PlusJakartaSans_600SemiBold' },
  featureDesc: { fontSize: 12, color: Colors.textMid, lineHeight: 18, fontFamily: 'PlusJakartaSans_400Regular' },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textMid, marginBottom: 8, fontFamily: 'PlusJakartaSans_600SemiBold' },
  optional: { fontWeight: '400', color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  input: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, marginBottom: 20, fontFamily: 'PlusJakartaSans_400Regular' },
  ageRow: { flexDirection: 'row', gap: 8, paddingBottom: 4, marginBottom: 24 },
  ageChip: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  ageChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  ageChipText: { fontSize: 13, fontWeight: '600', color: Colors.textMid, fontFamily: 'PlusJakartaSans_600SemiBold' },
  ageChipTextActive: { color: '#fff' },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  skipRow: { alignItems: 'center', marginTop: 16 },
  skipText: { fontSize: 13, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  checkCircle: { alignItems: 'center', marginBottom: 16 },
});
