import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const TABS = ['Daily', 'Weekly', 'Monthly', 'All time'] as const;
const ALL_SYSTEMS = ['Proprioceptive', 'Tactile', 'Vestibular', 'Auditory', 'Visual', 'Interoceptive'];

interface RowData {
  scheduled_date: string;
  status: string;
  sensory_system: string;
}

interface Stats {
  done: number;
  total: number;
  streak: number;
  daysActive: number;
  bySystem: { name: string; done: number; total: number; pct: number }[];
  heatmap: number[];
  startDate: string;
  endDate: string;
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function getTabRange(tab: typeof TABS[number]): { start: string; end: string } {
  const today = new Date();
  const end = toDateStr(today);
  if (tab === 'Daily') return { start: end, end };
  if (tab === 'Weekly') {
    const dow = today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    return { start: toDateStr(mon), end };
  }
  if (tab === 'Monthly') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: toDateStr(first), end };
  }
  // All time — show past year
  const yearAgo = new Date(today);
  yearAgo.setFullYear(today.getFullYear() - 1);
  return { start: toDateStr(yearAgo), end };
}

function computeStats(allRows: RowData[], tab: typeof TABS[number]): Stats {
  const today = new Date();
  const todayStr = toDateStr(today);
  const { start, end } = getTabRange(tab);

  const periodRows = allRows.filter(r => r.scheduled_date >= start && r.scheduled_date <= end);
  const done = periodRows.filter(r => r.status === 'done').length;
  const total = periodRows.length;

  // Consecutive-day streak ending today
  const doneDates = new Set(allRows.filter(r => r.status === 'done').map(r => r.scheduled_date));
  let streak = 0;
  const cur = new Date(today);
  while (doneDates.has(toDateStr(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  // Distinct days with >=1 done in the period
  const activeDays = new Set(periodRows.filter(r => r.status === 'done').map(r => r.scheduled_date)).size;

  // Per-system completion for the period (only systems that have data)
  const bySystem = ALL_SYSTEMS.map(sys => {
    const sysRows = periodRows.filter(r => r.sensory_system === sys);
    const sysDone = sysRows.filter(r => r.status === 'done').length;
    const pct = sysRows.length > 0 ? Math.round((sysDone / sysRows.length) * 100) : 0;
    return { name: sys, done: sysDone, total: sysRows.length, pct };
  }).filter(s => s.total > 0);

  // 28-day heatmap (always last 28 days)
  const heatmap: number[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = toDateStr(d);
    const dayRows = allRows.filter(r => r.scheduled_date === ds);
    if (dayRows.length === 0) {
      heatmap.push(0);
    } else {
      heatmap.push(dayRows.filter(r => r.status === 'done').length / dayRows.length);
    }
  }

  return { done, total, streak, daysActive: activeDays, bySystem, heatmap, startDate: start, endDate: end };
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pct(done: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((done / total) * 100)}%`;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Weekly');
  const [allRows, setAllRows] = useState<RowData[]>([]);
  const [childName, setChildName] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    setLoading(true);
    supabase.from('profiles').select('child_name').eq('id', userId).single()
      .then(({ data }) => setChildName(data?.child_name ?? ''));
    // Fetch past year to cover all tab ranges + heatmap
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    supabase
      .from('scheduled_activities')
      .select('scheduled_date, status, activity:activities(sensory_system)')
      .eq('user_id', userId)
      .gte('scheduled_date', toDateStr(yearAgo))
      .lte('scheduled_date', toDateStr(new Date()))
      .then(({ data, error }) => {
        if (!error && data) {
          setAllRows(data.map((r: any) => ({
            scheduled_date: r.scheduled_date,
            status: r.status,
            sensory_system: r.activity?.sensory_system ?? '',
          })));
        }
        setLoading(false);
      });
  }, [userId]));

  const stats = computeStats(allRows, activeTab);

  const metrics = [
    { value: stats.total === 0 ? '—' : `${stats.done}/${stats.total}`, label: activeTab === 'Daily' ? 'Done today' : activeTab === 'Weekly' ? 'Done this week' : activeTab === 'Monthly' ? 'Done this month' : 'Done (past year)' },
    { value: pct(stats.done, stats.total), label: 'Completion rate' },
    { value: `${stats.streak}`, label: 'Day streak' },
    { value: `${stats.daysActive}`, label: activeTab === 'Daily' ? 'Active today' : 'Active days' },
  ];

  const reportRange = `${formatDateLabel(stats.startDate)} – ${formatDateLabel(stats.endDate)}`;

  function buildReportHTML(): string {
    const barsRows = stats.bySystem.map(b =>
      `<tr><td>${b.name}</td><td style="padding:4px 8px"><div style="background:${Colors.border};border-radius:4px;height:10px;width:100%"><div style="background:${Colors.primary};height:10px;border-radius:4px;width:${b.pct}%"></div></div></td><td style="text-align:right;white-space:nowrap">${b.done}/${b.total} (${b.pct}%)</td></tr>`
    ).join('') || `<tr><td colspan="3" style="color:${Colors.textMid}">No data for this period</td></tr>`;

    const metricsHtml = metrics.map(m =>
      `<div style="flex:1;min-width:45%;background:${Colors.light};border:1px solid ${Colors.border};border-radius:12px;padding:14px;margin:5px">
        <div style="font-size:24px;font-weight:700;color:${Colors.text}">${m.value}</div>
        <div style="font-size:12px;color:${Colors.textMid};margin-top:4px">${m.label}</div>
      </div>`
    ).join('');

    // expo-print renders through a WebView with no access to the app's bundled
    // Playfair/Jakarta font files, so headings use a system serif as a stand-in
    // for the app's real display face rather than embedding custom fonts.
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:-apple-system,sans-serif;padding:32px;color:${Colors.text};max-width:600px;margin:0 auto;border-top:6px solid ${Colors.primary}}
    .brand{display:flex;align-items:center;gap:8px;margin-bottom:24px}
    .brandName{font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:15px;color:${Colors.dark};letter-spacing:-0.2px}
    h1{font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:${Colors.text};margin-bottom:4px}
    .range{color:${Colors.textMid};font-size:13px;margin-bottom:24px}
    .metrics{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse}td{padding:6px 0;font-size:13px;vertical-align:middle;color:${Colors.text}}
    .section{font-size:14px;font-weight:600;color:${Colors.text};margin-bottom:10px;margin-top:20px}
    </style></head><body>
    <div class="brand">
      <svg width="24" height="24" viewBox="0 0 44 44" fill="none">
        <path d="M6 30 Q22 8 38 30" stroke="${Colors.primary}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4"/>
        <path d="M10 33 Q22 14 34 33" stroke="${Colors.primary}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
        <path d="M14 36 Q22 20 30 36" stroke="${Colors.dark}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <circle cx="22" cy="36" r="3.5" fill="${Colors.dark}"/>
        <path d="M26 14 Q32 8 36 10 Q34 16 28 18 Q26 14 26 14Z" fill="${Colors.primary}"/>
      </svg>
      <span class="brandName">SensoryNest</span>
    </div>
    <h1>${childName ? `${escapeHtml(childName)}'s Progress Report` : 'Progress Report'}</h1>
    <div class="range">${reportRange}</div>
    <div class="section">Summary</div>
    <div class="metrics">${metricsHtml}</div>
    <div class="section">By Sensory System</div>
    <table>${barsRows}</table>
    <p style="font-size:11px;color:${Colors.textMid};border-top:1px solid ${Colors.border};margin-top:32px;padding-top:12px">Generated by SensoryNest on ${formatDateLabel(toDateStr(new Date()))}</p>
    </body></html>`;
  }

  async function handleShareReport() {
    setGeneratingPDF(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildReportHTML(), base64: false });

      // printToFileAsync names the file with a random UUID; rename it to something
      // recognizable before sharing, since this is the filename the OT actually sees.
      const namePart = childName.trim() ? `${childName.trim().replace(/[^a-zA-Z0-9]+/g, '')}-` : '';
      const fileName = `SensoryNest-Report-${namePart}${activeTab.replace(/\s+/g, '')}-${stats.endDate}.pdf`;
      const namedUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: namedUri });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(namedUri, { mimeType: 'application/pdf', dialogTitle: 'Save or share your OT report', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Saved', `PDF saved to:\n${namedUri}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not generate PDF.');
    } finally {
      setGeneratingPDF(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
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
            {metrics.map(m => (
              <View key={m.label} style={styles.metricCard}>
                <Text style={styles.metricValue}>{m.value}</Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Heatmap */}
          <View style={styles.heatCard}>
            <Text style={styles.heatTitle}>Activity streak, last 28 days</Text>
            <View style={styles.heatGrid}>
              {stats.heatmap.map((v, i) => (
                <View
                  key={i}
                  style={[styles.heatCell, { opacity: v === 0 ? 0.12 : Math.max(0.3, v) }]}
                />
              ))}
            </View>
            <View style={styles.heatLegend}>
              <Text style={styles.heatLegendText}>Less</Text>
              {[0.12, 0.35, 0.6, 0.85, 1].map((o, i) => (
                <View key={i} style={[styles.heatCell, styles.heatLegendCell, { opacity: o }]} />
              ))}
              <Text style={styles.heatLegendText}>More</Text>
            </View>
          </View>

          {/* Completion bars */}
          <View style={styles.barsCard}>
            <Text style={styles.barsTitle}>By sensory system</Text>
            {stats.bySystem.length === 0 ? (
              <Text style={styles.noData}>No activities scheduled in this period.</Text>
            ) : (
              stats.bySystem.map(b => (
                <View key={b.name} style={styles.barRow}>
                  <Text style={styles.barLabel}>{b.name}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${b.pct}%` as any }]} />
                  </View>
                  <Text style={styles.barPct}>{b.pct}%</Text>
                </View>
              ))
            )}
          </View>

          {/* OT Report card */}
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>{childName ? `${childName}'s Progress Report` : 'Progress Report'}</Text>
            <Text style={styles.reportRange}>{reportRange}</Text>
            <View style={styles.reportBtns}>
              <TouchableOpacity
                style={[styles.reportBtn, generatingPDF && { opacity: 0.6 }]}
                onPress={handleShareReport}
                disabled={generatingPDF}
                activeOpacity={0.8}
              >
                {generatingPDF
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={styles.reportBtnText}>Share report</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 22, fontWeight: '600', color: Colors.text, letterSpacing: -0.4, fontFamily: 'PlayfairDisplay_600SemiBold' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  heatLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  heatLegendCell: { width: 14, height: 14, borderRadius: 3 },
  heatLegendText: { fontSize: 10, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  barsCard: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, marginBottom: 16 },
  barsTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  barLabel: { fontSize: 12, color: Colors.textMid, width: 110, fontFamily: 'PlusJakartaSans_400Regular' },
  barTrack: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  barPct: { fontSize: 11, fontWeight: '600', color: Colors.textSoft, minWidth: 32, textAlign: 'right', fontFamily: 'PlusJakartaSans_600SemiBold' },
  noData: { fontSize: 13, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center', paddingVertical: 8 },
  reportCard: { backgroundColor: Colors.light, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 16 },
  reportTitle: { fontSize: 15, fontWeight: '600', color: Colors.dark, marginBottom: 4, fontFamily: 'PlusJakartaSans_600SemiBold' },
  reportRange: { fontSize: 12, color: Colors.textMid, marginBottom: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  reportBtns: { flexDirection: 'row', gap: 10 },
  reportBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  reportBtnText: { fontSize: 13, fontWeight: '600', color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
