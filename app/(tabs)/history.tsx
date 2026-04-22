import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

const TABS = ['Daily', 'Weekly', 'Monthly', 'All time'] as const;

const METRICS = [
  { value: '4/5', label: 'Activities done today' },
  { value: '87%', label: 'Completion this week' },
  { value: '23', label: 'Activities this month' },
  { value: '12', label: 'Day streak' },
];

const ACTIVITY_BARS = [
  { name: 'Proprioceptive', pct: 90 },
  { name: 'Vestibular', pct: 75 },
  { name: 'Tactile', pct: 60 },
  { name: 'Auditory', pct: 50 },
  { name: 'Visual', pct: 30 },
];

// 7 cols × 4 rows heatmap
const HEATMAP = Array.from({ length: 28 }, (_, i) => Math.random());

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Weekly');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Segmented control */}
        <View style={styles.segContainer}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setActiveTab(t)}
              style={[styles.segTab, activeTab === t && styles.segTabActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.segTabText, activeTab === t && styles.segTabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Metric cards */}
        <View style={styles.metricsGrid}>
          {METRICS.map(m => (
            <View key={m.label} style={styles.metricCard}>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Heatmap */}
        <View style={styles.heatCard}>
          <Text style={styles.heatTitle}>Activity streak</Text>
          <View style={styles.heatGrid}>
            {HEATMAP.map((v, i) => (
              <View
                key={i}
                style={[styles.heatCell, { opacity: v < 0.1 ? 0.15 : v }]}
              />
            ))}
          </View>
        </View>

        {/* Completion bars */}
        <View style={styles.barsCard}>
          <Text style={styles.barsTitle}>By sensory system</Text>
          {ACTIVITY_BARS.map(b => (
            <View key={b.name} style={styles.barRow}>
              <Text style={styles.barLabel}>{b.name}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${b.pct}%` as any }]} />
              </View>
              <Text style={styles.barPct}>{b.pct}%</Text>
            </View>
          ))}
        </View>

        {/* OT Report card */}
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>OT Progress Report</Text>
          <Text style={styles.reportRange}>Mar 1 – Apr 22, 2026</Text>
          <View style={styles.reportBtns}>
            <TouchableOpacity style={styles.reportBtn} activeOpacity={0.8}>
              <Text style={styles.reportBtnText}>Share report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.reportBtn, styles.reportBtnOutline]} activeOpacity={0.8}>
              <Text style={[styles.reportBtnText, { color: Colors.dark }]}>Download PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 22, fontWeight: '600', color: Colors.text, letterSpacing: -0.4, fontFamily: 'PlayfairDisplay_600SemiBold' },
  segContainer: { flexDirection: 'row', backgroundColor: Colors.light, borderRadius: 12, padding: 3, marginBottom: 16 },
  segTab: { flex: 1, borderRadius: 9, paddingVertical: 7, alignItems: 'center' },
  segTabActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  segTabText: { fontSize: 12, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_500Medium' },
  segTabTextActive: { color: Colors.dark, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metricCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14 },
  metricValue: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 4, fontFamily: 'PlusJakartaSans_700Bold' },
  metricLabel: { fontSize: 12, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  heatCard: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, marginBottom: 16 },
  heatTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatCell: { width: 36, height: 36, borderRadius: 4, backgroundColor: Colors.primary },
  barsCard: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, marginBottom: 16 },
  barsTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  barLabel: { fontSize: 12, color: Colors.textMid, width: 110, fontFamily: 'PlusJakartaSans_400Regular' },
  barTrack: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  barPct: { fontSize: 11, fontWeight: '600', color: Colors.textSoft, minWidth: 32, textAlign: 'right', fontFamily: 'PlusJakartaSans_600SemiBold' },
  reportCard: { backgroundColor: Colors.light, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 16 },
  reportTitle: { fontSize: 15, fontWeight: '600', color: Colors.dark, marginBottom: 4, fontFamily: 'PlusJakartaSans_600SemiBold' },
  reportRange: { fontSize: 12, color: Colors.textMid, marginBottom: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  reportBtns: { flexDirection: 'row', gap: 10 },
  reportBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  reportBtnOutline: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  reportBtnText: { fontSize: 13, fontWeight: '600', color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
