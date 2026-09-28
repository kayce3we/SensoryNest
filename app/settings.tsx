import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Switch, Alert, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, SensoryColors, type SensorySystem } from '@/constants/theme';
import { Linking } from 'react-native';
import { signOut, deleteAccount } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncEmptyReminders } from '@/lib/notifications';
import { PRIVACY_POLICY_URL, HEALTH_DATA_POLICY_URL } from '@/constants/links';

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
  const { userId, session } = useAuth();

  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childNotes, setChildNotes] = useState('');
  const [otName, setOtName] = useState('');
  const [otEmail, setOtEmail] = useState('');
  const [otNextSession, setOtNextSession] = useState('');
  const [sensoryProfile, setSensoryProfile] = useState<SensorySystem[]>([]);
  const [otSensoryOrder, setOtSensoryOrder] = useState<SensorySystem[]>([]);
  const [otNotes, setOtNotes] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderOffset, setReminderOffset] = useState('10 min before');
  const [dailyEmptyReminder, setDailyEmptyReminder] = useState(false);
  const [weeklyEmptyReminder, setWeeklyEmptyReminder] = useState(false);
  const [showSensoryOrderBanner, setShowSensoryOrderBanner] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('child_name, child_age, child_notes, ot_name, ot_email, ot_next_session, ot_notes, reminders_enabled')
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
          setOtNotes(data.ot_notes ?? '');
          setRemindersEnabled(data.reminders_enabled ?? true);
        }
        setLoadingProfile(false);
      });

    // Load local preferences
    AsyncStorage.getItem(`sensory_systems_${userId}`).then(v => {
      if (v) setSensoryProfile(JSON.parse(v) as SensorySystem[]);
    });
    AsyncStorage.getItem(`reminder_offset_${userId}`).then(v => {
      if (v) setReminderOffset(v);
    });
    AsyncStorage.getItem(`ot_sensory_order_${userId}`).then(v => {
      if (v) setOtSensoryOrder(JSON.parse(v) as SensorySystem[]);
    });
    AsyncStorage.getItem(`daily_empty_reminder_${userId}`).then(v => {
      if (v) setDailyEmptyReminder(v === 'true');
    });
    AsyncStorage.getItem(`weekly_empty_reminder_${userId}`).then(v => {
      if (v) setWeeklyEmptyReminder(v === 'true');
    });
    AsyncStorage.getItem(`show_sensory_order_banner_${userId}`).then(v => {
      if (v !== null) setShowSensoryOrderBanner(v === 'true');
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

    // Save core fields (always present)
    const { error } = await supabase
      .from('profiles')
      .update({
        child_name: childName || null,
        child_age: childAge ? parseInt(childAge) : null,
        child_notes: childNotes || null,
        ot_name: otName || null,
        ot_email: otEmail || null,
        ot_next_session: otNextSession || null,
        ot_notes: otNotes || null,
        reminders_enabled: remindersEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Save preferences locally
    await AsyncStorage.setItem(`sensory_systems_${userId}`, JSON.stringify(sensoryProfile));
    await AsyncStorage.setItem(`reminder_offset_${userId}`, reminderOffset);
    await AsyncStorage.setItem(`ot_sensory_order_${userId}`, JSON.stringify(otSensoryOrder));
    await AsyncStorage.setItem(`daily_empty_reminder_${userId}`, String(dailyEmptyReminder));
    await AsyncStorage.setItem(`weekly_empty_reminder_${userId}`, String(weeklyEmptyReminder));
    await AsyncStorage.setItem(`show_sensory_order_banner_${userId}`, String(showSensoryOrderBanner));
    syncEmptyReminders(userId).catch(console.error);

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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      setShowDeleteModal(false);
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Couldn\'t delete account', err.message ?? 'Please try again or contact support@sensorynest.app.');
    } finally {
      setDeleting(false);
    }
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
          <Field label="Notes / diagnosis" value={childNotes} onChangeText={setChildNotes} placeholder="Any relevant context for the home program…" multiline />
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

        {/* OT Recommended Order */}
        <SectionHeader
          label="OT RECOMMENDED ORDER"
          icon={<Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke={Colors.primary} strokeWidth="1.8" strokeLinecap="round" /></Svg>}
        />
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Sensory system sequence</Text>
          <Text style={[styles.fieldLabel, { fontWeight: '400', color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' }]}>
            Tap a system below to add it. Systems can repeat.
          </Text>
          {otSensoryOrder.length === 0 ? (
            <View style={styles.orderEmpty}>
              <Text style={styles.orderEmptyText}>No systems added yet. Tap a chip below to start.</Text>
            </View>
          ) : (
            otSensoryOrder.map((s, i) => {
              const col = SensoryColors[s];
              return (
                <View key={`${s}-${i}`} style={styles.orderRow}>
                  <View style={[styles.orderIndex, { backgroundColor: col.bg }]}>
                    <Text style={[styles.orderIndexText, { color: col.text }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.orderLabel, { color: col.text, backgroundColor: col.bg }]}>{s}</Text>
                  <View style={styles.orderBtns}>
                    <TouchableOpacity
                      disabled={i === 0}
                      onPress={() => setOtSensoryOrder(prev => {
                        const arr = [...prev]; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; return arr;
                      })}
                      style={[styles.orderBtn, { opacity: i === 0 ? 0.2 : 1 }]}
                      activeOpacity={0.7}
                    >
                      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                        <Path d="M8 11V5M5 8l3-3 3 3" stroke={Colors.dark} strokeWidth="1.5" strokeLinecap="round" />
                      </Svg>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={i === otSensoryOrder.length - 1}
                      onPress={() => setOtSensoryOrder(prev => {
                        const arr = [...prev]; [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; return arr;
                      })}
                      style={[styles.orderBtn, { opacity: i === otSensoryOrder.length - 1 ? 0.2 : 1 }]}
                      activeOpacity={0.7}
                    >
                      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                        <Path d="M8 5v6M5 8l3 3 3-3" stroke={Colors.dark} strokeWidth="1.5" strokeLinecap="round" />
                      </Svg>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setOtSensoryOrder(prev => prev.filter((_, idx) => idx !== i))}
                      style={styles.orderRemoveBtn}
                      activeOpacity={0.7}
                    >
                      <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                        <Path d="M2 2l10 10M12 2L2 12" stroke={Colors.textSoft} strokeWidth="1.5" strokeLinecap="round" />
                      </Svg>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          <Text style={[styles.fieldLabel, { marginTop: 12, marginBottom: 6 }]}>+ Add to order:</Text>
          <View style={styles.chipGrid}>
            {SENSORY_SYSTEMS.map(s => {
              const col = SensoryColors[s];
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setOtSensoryOrder(prev => [...prev, s])}
                  style={[styles.chip, { backgroundColor: col.bg, borderColor: col.bg }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: col.text }]}>{s}</Text>
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
          <Field label="OT notes" value={otNotes} onChangeText={setOtNotes} placeholder="Notes or reminders from your OT…" multiline />
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
              {['5 min before', '10 min before', '15 min before', 'At time'].map(opt => {
                const active = reminderOffset === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setReminderOffset(opt)}
                    style={[styles.reminderChip, active && styles.reminderChipActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.reminderChipText, active && styles.reminderChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={[styles.switchRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.switchLabel}>Empty day reminder</Text>
              <Text style={styles.switchSub}>Ping at 8:00 AM if nothing is scheduled that day</Text>
            </View>
            <Switch
              value={dailyEmptyReminder}
              onValueChange={setDailyEmptyReminder}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.switchLabel}>Empty week reminder</Text>
              <Text style={styles.switchSub}>Ping Sunday 8:00 AM if the coming week is empty</Text>
            </View>
            <Switch
              value={weeklyEmptyReminder}
              onValueChange={setWeeklyEmptyReminder}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.switchRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, opacity: otSensoryOrder.length === 0 ? 0.4 : 1 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.switchLabel}>Show Sensory System Order banner on Home Screen</Text>
              <Text style={styles.switchSub}>
                {otSensoryOrder.length === 0
                  ? 'Set a sensory order above to enable this'
                  : 'Display the OT recommended order at the top of your daily diet'}
              </Text>
            </View>
            <Switch
              value={otSensoryOrder.length > 0 && showSensoryOrderBanner}
              onValueChange={otSensoryOrder.length > 0 ? setShowSensoryOrderBanner : undefined}
              disabled={otSensoryOrder.length === 0}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
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

        {/* Account */}
        {session?.user?.email && (
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Signed in as</Text>
            <Text style={styles.accountEmail}>{session.user.email}</Text>
          </View>
        )}

        {/* Legal links */}
        <View style={styles.legalRow}>
          <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            Privacy policy
          </Text>
          <View style={styles.legalDivider} />
          <Text style={styles.legalLink} onPress={() => Linking.openURL(HEALTH_DATA_POLICY_URL)}>
            Health data policy
          </Text>
        </View>

        {/* Contact */}
        <TouchableOpacity
          style={styles.contactBtn}
          onPress={() => Linking.openURL('mailto:support@sensorynest.app?subject=SensoryNest%20Feedback')}
          activeOpacity={0.8}
        >
          <Text style={styles.contactText}>Contact us</Text>
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* Delete account */}
        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={() => { setDeleteConfirmText(''); setShowDeleteModal(true); }}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteAccountText}>Delete account</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !deleting && setShowDeleteModal(false)} />
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete your account?</Text>
            <Text style={styles.deleteModalBody}>
              This permanently deletes your account, your child's profile, activities, goals, and history. This can't be undone.
            </Text>
            <Text style={styles.deleteModalLabel}>Type DELETE to confirm</Text>
            <TextInput
              style={styles.deleteModalInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor={Colors.textSoft}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
            />
            <TouchableOpacity
              style={[
                styles.deleteModalConfirmBtn,
                (deleteConfirmText !== 'DELETE' || deleting) && { opacity: 0.5 },
              ]}
              onPress={handleConfirmDelete}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              activeOpacity={0.85}
            >
              {deleting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.deleteModalConfirmText}>Delete my account</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteModalCancelBtn}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleting}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  reminderChipActive: { backgroundColor: Colors.light, borderColor: Colors.primary },
  reminderChipText: { fontSize: 12, color: Colors.textMid, fontFamily: 'PlusJakartaSans_400Regular' },
  reminderChipTextActive: { color: Colors.dark, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  saveBtn: { marginTop: 24, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDone: { backgroundColor: '#4CAF7D' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  accountRow: { marginTop: 20, alignItems: 'center' },
  accountLabel: { fontSize: 11, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 2 },
  accountEmail: { fontSize: 13, color: Colors.textMid, fontFamily: 'PlusJakartaSans_500Medium' },
  legalRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  legalLink: { fontSize: 12, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_500Medium', textDecorationLine: 'underline' },
  legalDivider: { width: 1, height: 11, backgroundColor: Colors.border },
  contactBtn: { marginTop: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  contactText: { fontSize: 15, fontWeight: '600', color: Colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  signOutBtn: { marginTop: 10, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  signOutText: { fontSize: 15, fontWeight: '600', color: Colors.textMid, fontFamily: 'PlusJakartaSans_600SemiBold' },
  deleteAccountBtn: { marginTop: 24, paddingVertical: 10, alignItems: 'center' },
  deleteAccountText: { fontSize: 13, fontWeight: '500', color: '#B54545', fontFamily: 'PlusJakartaSans_500Medium' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  deleteModal: { width: '100%', backgroundColor: Colors.white, borderRadius: 16, padding: 20 },
  deleteModalTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, marginBottom: 8, fontFamily: 'PlayfairDisplay_600SemiBold' },
  deleteModalBody: { fontSize: 13, color: Colors.textMid, lineHeight: 19, marginBottom: 18, fontFamily: 'PlusJakartaSans_400Regular' },
  deleteModalLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMid, marginBottom: 6, fontFamily: 'PlusJakartaSans_600SemiBold' },
  deleteModalInput: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, marginBottom: 16, fontFamily: 'PlusJakartaSans_400Regular' },
  deleteModalConfirmBtn: { backgroundColor: '#B54545', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  deleteModalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },
  deleteModalCancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  deleteModalCancelText: { fontSize: 14, fontWeight: '500', color: Colors.textSoft, fontFamily: 'PlusJakartaSans_500Medium' },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  orderIndex: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  orderIndexText: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  orderLabel: { flex: 1, fontSize: 13, fontWeight: '500', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontFamily: 'PlusJakartaSans_500Medium' },
  orderBtns: { flexDirection: 'row', gap: 4 },
  orderBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  orderRemoveBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  orderEmpty: { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 10, padding: 14, alignItems: 'center' },
  orderEmptyText: { fontSize: 13, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
});
