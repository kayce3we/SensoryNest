import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/constants/theme';
import { SensoryTag } from '@/components/ui/SensoryTag';
import type { SensorySystem } from '@/constants/theme';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const TIMES_OF_DAY = ['Morning', 'Pre-school', 'Midday', 'After-school', 'Evening', 'Bedtime'];
const REMINDERS = ['5 min before', '10 min before', '15 min before', 'At time'];

const TIME_MAP: Record<string, string> = {
  Morning: '8:00 AM',
  'Pre-school': '9:00 AM',
  Midday: '12:00 PM',
  'After-school': '3:30 PM',
  Evening: '6:00 PM',
  Bedtime: '8:00 PM',
};

export default function ScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name: string; desc: string; system: string; duration: string }>();

  const [selDays, setSelDays] = useState(['Mo', 'Tu', 'We', 'Th', 'Fr']);
  const [timeOfDay, setTimeOfDay] = useState('After-school');
  const [reminder, setReminder] = useState('10 min before');
  const [saved, setSaved] = useState(false);

  function toggleDay(d: string) {
    setSelDays(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d]);
  }

  function handleSave() {
    if (selDays.length === 0) {
      Alert.alert('Select days', 'Please select at least one day.');
      return;
    }
    // TODO: persist to Supabase scheduled_activities
    setSaved(true);
  }

  if (saved) {
    return (
      <View style={[styles.screen, styles.successScreen, { paddingTop: insets.top }]}>
        <View style={styles.successIcon}>
          <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
            <Path d="M8 18l7 7 13-13" stroke={Colors.primary} strokeWidth="2.5" strokeLinecap="round" />
          </Svg>
        </View>
        <Text style={styles.successTitle}>Saved to diet!</Text>
        <Text style={styles.successSub}>{params.name} has been added to your schedule.</Text>
        <TouchableOpacity style={styles.backToTodayBtn} onPress={() => router.replace('/(tabs)')} activeOpacity={0.85}>
          <Text style={styles.backToTodayText}>Back to Today</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Path d="M12 4l-6 6 6 6" stroke={Colors.text} strokeWidth="1.8" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Schedule Activity</Text>
          {params.system && <SensoryTag system={params.system as SensorySystem} small />}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Activity summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryName}>{params.name}</Text>
          {params.desc ? <Text style={styles.summaryDesc}>{params.desc}</Text> : null}
        </View>

        {/* Days of week */}
        <Text style={styles.sectionLabel}>Days of week</Text>
        <View style={styles.daysRow}>
          {DAYS.map(d => (
            <TouchableOpacity
              key={d}
              onPress={() => toggleDay(d)}
              style={[styles.dayBtn, selDays.includes(d) && styles.dayBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayBtnText, selDays.includes(d) && styles.dayBtnTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time of day */}
        <Text style={styles.sectionLabel}>Time of day</Text>
        <View style={styles.gridTwo}>
          {TIMES_OF_DAY.map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTimeOfDay(t)}
              style={[styles.gridBtn, timeOfDay === t && styles.gridBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.gridBtnText, timeOfDay === t && styles.gridBtnTextActive]}>{t}</Text>
              <Text style={[styles.gridBtnSub, timeOfDay === t && { color: Colors.dark }]}>{TIME_MAP[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Remind me */}
        <Text style={styles.sectionLabel}>Remind me</Text>
        <View style={styles.gridTwo}>
          {REMINDERS.map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setReminder(r)}
              style={[styles.gridBtn, reminder === r && styles.gridBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.gridBtnText, reminder === r && styles.gridBtnTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Save to diet</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 22, fontWeight: '600', color: Colors.text, letterSpacing: -0.4, fontFamily: 'PlayfairDisplay_600SemiBold', marginBottom: 4 },
  summaryCard: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, marginBottom: 20 },
  summaryName: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 4, fontFamily: 'PlusJakartaSans_600SemiBold' },
  summaryDesc: { fontSize: 12, color: Colors.textMid, lineHeight: 18, fontFamily: 'PlusJakartaSans_400Regular' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMid, marginBottom: 10, fontFamily: 'PlusJakartaSans_600SemiBold' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dayBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  dayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textMid, fontFamily: 'PlusJakartaSans_600SemiBold' },
  dayBtnTextActive: { color: '#fff' },
  gridTwo: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  gridBtn: { width: '47%', backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  gridBtnActive: { backgroundColor: Colors.light, borderColor: Colors.primary },
  gridBtnText: { fontSize: 13, fontWeight: '500', color: Colors.textMid, fontFamily: 'PlusJakartaSans_500Medium' },
  gridBtnTextActive: { color: Colors.dark, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  gridBtnSub: { fontSize: 11, color: Colors.textSoft, marginTop: 2, fontFamily: 'PlusJakartaSans_400Regular' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  successScreen: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.light, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '600', color: Colors.text, marginBottom: 8, fontFamily: 'PlayfairDisplay_600SemiBold' },
  successSub: { fontSize: 14, color: Colors.textMid, textAlign: 'center', marginBottom: 28, fontFamily: 'PlusJakartaSans_400Regular' },
  backToTodayBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },
  backToTodayText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
