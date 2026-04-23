import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, SensoryColors, type SensorySystem } from '@/constants/theme';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const SENSORY_SYSTEMS: SensorySystem[] = [
  'Proprioceptive', 'Tactile', 'Vestibular', 'Auditory', 'Visual', 'Interoceptive',
];

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionHeaderText}>{label}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor={Colors.textSoft}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childNotes, setChildNotes] = useState('');
  const [otName, setOtName] = useState('');
  const [otEmail, setOtEmail] = useState('');
  const [otNextSession, setOtNextSession] = useState('');
  const [sensoryProfile, setSensoryProfile] = useState<SensorySystem[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('child_name, child_age, child_notes, ot_name, ot_email, ot_next_session, reminders_enabled')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setChildName(data.child_name ?? '');
          setChildAge(data.child_age != null ? String(data.child_age) : '');
          setChildNotes(data.child_notes ?? '');
          setOtName(data.ot_name ?? '');
          setOtEmail(data.ot_email ?? '');
          setOtNextSession(data.ot_next_session ?? '');
          setRemindersEnabled(data.reminders_enabled ?? true);
        }
        setLoadingProfile(false);
      });
  }, [userId]);

  function toggleSensory(system: SensorySystem) {
    setSensoryProfile(prev =>
      prev.includes(system) ? prev.filter(s => s !== system) : [...prev, system]
    );
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        child_name: childName || null,
        child_age: childAge ? parseInt(childAge) : null,
        child_notes: childNotes || null,
        ot_name: otName || null,
        ot_email: otEmail || null,
        ot_next_session: otNextSession || null,
        reminders_enabled: remindersEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Path d="M12 4l-6 6 6 6" stroke={Colors.text} strokeWidth="1.8" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Child profile */}
        <SectionHeader
          label="CHILD PROFILE"
          icon={<Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="8" r="4" stroke={Colors.primary} strokeWidth="1.8" /><Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={Colors.primary} strokeWidth="1.8" strokeLinecap="round" /></Svg>}
        />
        <View style={styles.card}>
          <Field label="Child's name" value={childName} onChangeText={setChildName} placeholder="e.g. Liam" />
          <Field label="Age" value={childAge} onChangeText={setChildAge} placeholder="e.g. 7" />
          <Field label="Notes / diagnosis" value={childNotes} onChangeText={setChildNotes} placeholder="Any relevant context for the OT plan…" multiline />
        </View>

        {/* Sensory profile */}
        <SectionHeader
          label="SENSORY PROFILE"
          icon={<Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke={Colors.primary} strokeWidth="1.8" fill="none" /></Svg>}
        />
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Primary sensory systems</Text>
          <View style={styles.chipGrid}>
            {SENSORY_SYSTEMS.map(s => {
              const col = SensoryColors[s];
              const active = sensoryProfile.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleSensory(s)}
                  style={[styles.chip, active && { backgroundColor: col.bg, borderColor: col.bg }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && { color: col.text }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* OT details */}
        <SectionHeader
          label="OT DETAILS"
          icon={<Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M9 12l2 2 4-4" stroke={Colors.primary} strokeWidth="1.8" strokeLinecap="round" /><Path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke={Colors.primary} strokeWidth="1.8" fill="none" /></Svg>}
        />
        <View style={styles.card}>
          <Field label="OT name" value={otName} onChangeText={setOtName} placeholder="e.g. Dr. Maya Patel" />
          <Field label="Email / contact" value={otEmail} onChangeText={setOtEmail} placeholder="ot@example.com" />
          <Field label="Next session date" value={otNextSession} onChangeText={setOtNextSession} placeholder="e.g. May 1, 2026" />
        </View>

        {/* Reminders */}
        <SectionHeader
          label="REMINDERS"
          icon={<Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={Colors.primary} strokeWidth="1.8" strokeLinecap="round" /></Svg>}
        />
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Activity reminders</Text>
              <Text style={styles.switchSub}>Get notified before each activity</Text>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={setRemindersEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
          {remindersEnabled && (
            <View style={styles.reminderGrid}>
              {['5 min before', '10 min before', '15 min before', 'At time'].map(opt => (
                <TouchableOpacity key={opt} style={styles.reminderChip} activeOpacity={0.8}>
                  <Text style={styles.reminderChipText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnDone, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving || loadingProfile}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>{saved ? 'Saved ✓' : 'Save settings'}</Text>
          }
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '600', color: Colors.text, letterSpacing: -0.4, fontFamily: 'PlayfairDisplay_600SemiBold' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 10 },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', color: Colors.textSoft, letterSpacing: 0.9, textTransform: 'uppercase', fontFamily: 'PlusJakartaSans_700Bold' },
  card: { backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 12 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMid, fontFamily: 'PlusJakartaSans_600SemiBold' },
  input: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text, fontFamily: 'PlusJakartaSans_400Regular' },
  inputMultiline: { height: 72, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.white },
  chipText: { fontSize: 12, color: Colors.textMid, fontFamily: 'PlusJakartaSans_400Regular' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, fontFamily: 'PlusJakartaSans_600SemiBold' },
  switchSub: { fontSize: 12, color: Colors.textSoft, marginTop: 2, fontFamily: 'PlusJakartaSans_400Regular' },
  reminderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  reminderChip: { borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.bg },
  reminderChipText: { fontSize: 12, color: Colors.textMid, fontFamily: 'PlusJakartaSans_400Regular' },
  saveBtn: { marginTop: 24, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDone: { backgroundColor: '#4CAF7D' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  signOutBtn: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  signOutText: { fontSize: 15, fontWeight: '600', color: Colors.textMid, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
