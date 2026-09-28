import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, SensoryColors, type SensorySystem } from '@/constants/theme';
import { SensoryTag } from '@/components/ui/SensoryTag';
import { SourceBadge } from '@/components/ui/SourceBadge';
import { supabase } from '@/lib/supabase';
import { syncEmptyReminders } from '@/lib/notifications';
import { useAuth } from '@/context/AuthContext';
import { useActivities } from '@/context/ActivitiesContext';

interface Row {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: 'pending' | 'done' | 'skipped';
  sort_order: number;
  activity: {
    id: string;
    name: string;
    description: string | null;
    sensory_system: SensorySystem;
    source: 'ot' | 'library' | 'my';
    duration: number;
  };
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY_FULL = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function parseTimeToMinutes(t: string | null): number {
  if (!t) return 99999;
  const [time, period] = t.split(' ');
  const [h, m] = time.split(':').map(Number);
  let hours = h % 12;
  if (period === 'PM') hours += 12;
  return hours * 60 + (m || 0);
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

function parseTimeString(t: string): Date {
  const d = new Date();
  const [time, period] = t.split(' ');
  const [h, m] = time.split(':').map(Number);
  let hours = h % 12;
  if (period === 'PM') hours += 12;
  d.setHours(hours, m || 0, 0, 0);
  return d;
}

function getWeekBounds(offset: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMon + offset * 7);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  const sunday = days[6];
  return { start: toDateStr(monday), end: toDateStr(sunday), days };
}

function formatWeekLabel(days: Date[]): string {
  const first = days[0];
  const last = days[6];
  if (first.getMonth() === last.getMonth()) {
    return `${MONTHS[first.getMonth()]} ${first.getDate()} – ${last.getDate()}, ${last.getFullYear()}`;
  }
  return `${MONTHS[first.getMonth()]} ${first.getDate()} – ${MONTHS[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
}

export default function WeekScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const { refresh: refreshToday } = useActivities();

  const [weekOffset, setWeekOffset] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<Row | null>(null);
  const [rescheduleRow, setRescheduleRow] = useState<Row | null>(null);
  const [newDate, setNewDate] = useState(new Date());
  const [newTime, setNewTime] = useState(new Date());
  const [showAndroidDate, setShowAndroidDate] = useState(false);
  const [showAndroidTime, setShowAndroidTime] = useState(false);
  const [saving, setSaving] = useState(false);

  const { start: weekStart, end: weekEnd, days } = getWeekBounds(weekOffset);
  const todayStr = toDateStr(new Date());

  const scrollRef = useRef<ScrollView>(null);
  const dayOffsetsRef = useRef<Record<string, number>>({});

  async function fetchWeek() {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_activities')
        .select('id, scheduled_date, scheduled_time, status, sort_order, activity:activities(id, name, description, sensory_system, source, duration)')
        .eq('user_id', userId)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd)
        .order('scheduled_date', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setRows((data ?? []) as any);
    } catch (e: any) {
      console.error('Failed to load week', e);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchWeek(); }, [userId, weekOffset]));

  // Group rows by date
  const rowsByDate = new Map<string, Row[]>();
  for (const r of rows) {
    if (!rowsByDate.has(r.scheduled_date)) rowsByDate.set(r.scheduled_date, []);
    rowsByDate.get(r.scheduled_date)!.push(r);
  }
  for (const [, list] of rowsByDate) {
    list.sort((a, b) => parseTimeToMinutes(a.scheduled_time) - parseTimeToMinutes(b.scheduled_time));
  }

  const totalCount = rows.length;
  const doneCount = rows.filter(r => r.status === 'done').length;
  const donePct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  async function handleToggleDone(row: Row) {
    const next = row.status === 'done' ? 'pending' : 'done';
    // Optimistic
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: next } as Row : r));
    const { error } = await supabase.from('scheduled_activities').update({ status: next }).eq('id', row.id);
    if (error) {
      console.error('toggle done failed', error.message);
      fetchWeek();
      return;
    }
    if (row.scheduled_date === todayStr) await refreshToday();
    if (userId) syncEmptyReminders(userId).catch(console.error);
  }

  async function handleDelete(row: Row) {
    setActionTarget(null);
    Alert.alert(
      'Remove activity',
      `Remove "${row.activity.name}" from ${row.scheduled_date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRows(prev => prev.filter(r => r.id !== row.id));
            const { error } = await supabase.from('scheduled_activities').delete().eq('id', row.id);
            if (error) {
              console.error('delete failed', error.message);
              fetchWeek();
              return;
            }
            if (row.scheduled_date === todayStr) await refreshToday();
            if (userId) syncEmptyReminders(userId).catch(console.error);
          },
        },
      ]
    );
  }

  function openReschedule(row: Row) {
    setActionTarget(null);
    setRescheduleRow(row);
    setNewDate(parseDateStr(row.scheduled_date));
    setNewTime(row.scheduled_time ? parseTimeString(row.scheduled_time) : new Date());
  }

  async function handleSaveReschedule() {
    if (!rescheduleRow) return;
    setSaving(true);
    try {
      const dateStr = toDateStr(newDate);
      const timeStr = formatTime(newTime);
      const { error } = await supabase
        .from('scheduled_activities')
        .update({ scheduled_date: dateStr, scheduled_time: timeStr })
        .eq('id', rescheduleRow.id);
      if (error) throw error;

      const oldDate = rescheduleRow.scheduled_date;
      setRescheduleRow(null);

      // If new date is within current week, update in place; otherwise remove
      if (dateStr >= weekStart && dateStr <= weekEnd) {
        setRows(prev => prev.map(r => r.id === rescheduleRow.id ? { ...r, scheduled_date: dateStr, scheduled_time: timeStr } : r));
      } else {
        setRows(prev => prev.filter(r => r.id !== rescheduleRow.id));
      }

      // Refresh home if old or new date is today
      if (oldDate === todayStr || dateStr === todayStr) await refreshToday();
      if (userId) syncEmptyReminders(userId).catch(console.error);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not reschedule.');
    } finally {
      setSaving(false);
    }
  }

  function scrollToDay(dateStr: string) {
    const y = dayOffsetsRef.current[dateStr];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }

  // On load of current week, auto-scroll to today's section
  useEffect(() => {
    if (!loading && weekOffset === 0) {
      const t = setTimeout(() => scrollToDay(todayStr), 200);
      return () => clearTimeout(t);
    }
  }, [loading, weekOffset]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
            <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
              <Path d="M12 4l-6 6 6 6" stroke={Colors.text} strokeWidth="1.8" strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.title}>This Week</Text>
          <TouchableOpacity
            onPress={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
            style={[styles.todayBtn, weekOffset === 0 && { opacity: 0.3 }]}
            activeOpacity={0.8}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.weekLabel}>{formatWeekLabel(days)}</Text>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} style={styles.navBtn} activeOpacity={0.7}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M9 3L4 7l5 4" stroke={Colors.dark} strokeWidth="1.6" strokeLinecap="round" />
            </Svg>
            <Text style={styles.navBtnText}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset(o => o + 1)} style={styles.navBtn} activeOpacity={0.7}>
            <Text style={styles.navBtnText}>Next</Text>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M5 3l5 4-5 4" stroke={Colors.dark} strokeWidth="1.6" strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.daysRow}>
          {days.map((d, i) => {
            const ds = toDateStr(d);
            const dayRows = rowsByDate.get(ds) ?? [];
            const isToday = ds === todayStr;
            return (
              <TouchableOpacity
                key={ds}
                style={styles.dayPill}
                onPress={() => scrollToDay(ds)}
                disabled={dayRows.length === 0}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayLetter, isToday && { color: Colors.primary, fontWeight: '700' }]}>
                  {DAY_LABELS[i]}
                </Text>
                <View style={[styles.dayNumWrap, isToday && styles.dayNumToday]}>
                  <Text style={[styles.dayNum, isToday && { color: Colors.primary }]}>{d.getDate()}</Text>
                </View>
                <View style={styles.dotsRow}>
                  {dayRows.length === 0 ? (
                    <View style={[styles.dot, styles.dotEmpty]} />
                  ) : (
                    <>
                      {dayRows.slice(0, 6).map((r, idx) => (
                        <View
                          key={idx}
                          style={[styles.dot, { backgroundColor: SensoryColors[r.activity.sensory_system]?.text ?? Colors.primary }]}
                        />
                      ))}
                      {dayRows.length > 6 && <Text style={styles.overflowBadge}>+{dayRows.length - 6}</Text>}
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {totalCount > 0 && (
          <Text style={styles.completionLine}>
            {doneCount} of {totalCount} done this week · {donePct}%
          </Text>
        )}
      </View>

      {/* Scrollable content */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : totalCount === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No activities scheduled this week.</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {days.map((d, i) => {
            const ds = toDateStr(d);
            const dayRows = rowsByDate.get(ds) ?? [];
            if (dayRows.length === 0) return null;
            const isToday = ds === todayStr;
            return (
              <View
                key={ds}
                onLayout={e => { dayOffsetsRef.current[ds] = e.nativeEvent.layout.y; }}
              >
                <Text style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
                  {DAY_FULL[i]} · {MONTHS[d.getMonth()]} {d.getDate()}{isToday ? ' · Today' : ''}
                </Text>
                {dayRows.map(row => (
                  <ActivityRow
                    key={row.id}
                    row={row}
                    onToggle={() => handleToggleDone(row)}
                    onMore={() => setActionTarget(row)}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Action sheet */}
      <Modal
        visible={!!actionTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setActionTarget(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setActionTarget(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle} numberOfLines={1}>{actionTarget?.activity.name}</Text>
          <TouchableOpacity
            style={styles.sheetBtn}
            onPress={() => actionTarget && openReschedule(actionTarget)}
            activeOpacity={0.8}
          >
            <Text style={styles.sheetBtnText}>Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sheetBtn, styles.sheetBtnDestructive]}
            onPress={() => actionTarget && handleDelete(actionTarget)}
            activeOpacity={0.8}
          >
            <Text style={[styles.sheetBtnText, { color: '#c0392b' }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sheetBtn, styles.sheetBtnCancel]}
            onPress={() => setActionTarget(null)}
            activeOpacity={0.8}
          >
            <Text style={[styles.sheetBtnText, { color: Colors.textSoft }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Reschedule modal */}
      <Modal
        visible={!!rescheduleRow}
        transparent
        animationType="slide"
        onRequestClose={() => setRescheduleRow(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRescheduleRow(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Reschedule</Text>
          <Text style={styles.sheetSub} numberOfLines={1}>{rescheduleRow?.activity.name}</Text>

          <Text style={styles.fieldLabel}>Date</Text>
          {Platform.OS === 'ios' ? (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={newDate}
                mode="date"
                display="compact"
                onChange={(_, d) => { if (d) setNewDate(d); }}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.androidPickerBtn} onPress={() => setShowAndroidDate(true)} activeOpacity={0.8}>
                <Text style={styles.androidPickerText}>
                  {`${MONTHS[newDate.getMonth()]} ${newDate.getDate()}, ${newDate.getFullYear()}`}
                </Text>
              </TouchableOpacity>
              {showAndroidDate && (
                <DateTimePicker
                  value={newDate}
                  mode="date"
                  display="default"
                  onChange={(_, d) => { setShowAndroidDate(false); if (d) setNewDate(d); }}
                />
              )}
            </>
          )}

          <Text style={styles.fieldLabel}>Time</Text>
          {Platform.OS === 'ios' ? (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={newTime}
                mode="time"
                display="compact"
                onChange={(_, d) => { if (d) setNewTime(d); }}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.androidPickerBtn} onPress={() => setShowAndroidTime(true)} activeOpacity={0.8}>
                <Text style={styles.androidPickerText}>{formatTime(newTime)}</Text>
              </TouchableOpacity>
              {showAndroidTime && (
                <DateTimePicker
                  value={newTime}
                  mode="time"
                  display="default"
                  onChange={(_, d) => { setShowAndroidTime(false); if (d) setNewTime(d); }}
                />
              )}
            </>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveReschedule}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setRescheduleRow(null)} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function ActivityRow({ row, onToggle, onMore }: { row: Row; onToggle: () => void; onMore: () => void }) {
  const isDone = row.status === 'done';
  return (
    <View style={[styles.cardWrap, isDone && { opacity: 0.55 }]}>
      {row.scheduled_time && <Text style={styles.timeLabel}>{row.scheduled_time}</Text>}
      <View style={styles.card}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onToggle} activeOpacity={0.7}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>{row.activity.name}</Text>
            {isDone && (
              <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <Circle cx="8" cy="8" r="8" fill={Colors.primary} />
                <Path d="M4.5 8l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
              </Svg>
            )}
          </View>
          <View style={styles.cardFooter}>
            <SensoryTag system={row.activity.sensory_system} small />
            <SourceBadge source={row.activity.source} />
            <Text style={styles.duration}>{row.activity.duration} min</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onMore} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.moreBtn} activeOpacity={0.6}>
          <Svg width={16} height={4} viewBox="0 0 16 4" fill="none">
            <Circle cx="2" cy="2" r="1.4" fill={Colors.textSoft} />
            <Circle cx="8" cy="2" r="1.4" fill={Colors.textSoft} />
            <Circle cx="14" cy="2" r="1.4" fill={Colors.textSoft} />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', color: Colors.text, fontFamily: 'PlayfairDisplay_600SemiBold', letterSpacing: -0.3 },
  todayBtn: { backgroundColor: Colors.light, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  todayBtnText: { fontSize: 12, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
  weekLabel: { fontSize: 13, color: Colors.textMid, marginLeft: 28, fontFamily: 'PlusJakartaSans_400Regular' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.light, borderRadius: 8, paddingVertical: 7 },
  navBtnText: { fontSize: 12, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
  summaryStrip: {
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingVertical: 12, paddingHorizontal: 8,
  },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPill: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  dayLetter: { fontSize: 10, color: Colors.textSoft, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  dayNumWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayNumToday: { borderWidth: 1.5, borderColor: Colors.primary },
  dayNum: { fontSize: 13, fontWeight: '600', color: Colors.text, fontFamily: 'PlusJakartaSans_600SemiBold' },
  dotsRow: { flexDirection: 'row', gap: 2, alignItems: 'center', minHeight: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 44 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dotEmpty: { backgroundColor: Colors.border, opacity: 0.5 },
  overflowBadge: { fontSize: 8, color: Colors.textSoft, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold', marginLeft: 1 },
  completionLine: { textAlign: 'center', fontSize: 11, color: Colors.textSoft, marginTop: 10, fontFamily: 'PlusJakartaSans_500Medium' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: Colors.textSoft, textAlign: 'center', fontFamily: 'PlusJakartaSans_400Regular' },
  dayHeader: {
    fontSize: 11, fontWeight: '700', color: Colors.textSoft, letterSpacing: 0.9,
    marginTop: 14, marginBottom: 8, fontFamily: 'PlusJakartaSans_700Bold',
  },
  dayHeaderToday: { color: Colors.primary },
  cardWrap: { marginBottom: 8 },
  timeLabel: { fontSize: 10, color: Colors.textSoft, marginBottom: 4, marginLeft: 2, fontFamily: 'PlusJakartaSans_500Medium' },
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingVertical: 10, paddingLeft: 12, paddingRight: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text, fontFamily: 'PlusJakartaSans_600SemiBold' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  duration: { fontSize: 11, color: Colors.textSoft, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium', marginLeft: 'auto' },
  moreBtn: { paddingHorizontal: 8, paddingVertical: 10, alignSelf: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 16,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4, fontFamily: 'PlusJakartaSans_700Bold' },
  sheetSub: { fontSize: 12, color: Colors.textSoft, marginBottom: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  sheetBtn: { backgroundColor: Colors.light, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  sheetBtnDestructive: { backgroundColor: '#fdeeee' },
  sheetBtnCancel: { backgroundColor: 'transparent' },
  sheetBtnText: { fontSize: 14, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMid, marginTop: 14, marginBottom: 6, fontFamily: 'PlusJakartaSans_600SemiBold' },
  pickerWrap: { alignItems: 'flex-start' },
  androidPickerBtn: { backgroundColor: Colors.light, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  androidPickerText: { fontSize: 14, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSoft, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },
});
