import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/theme';

interface Goal {
  id: number;
  title: string;
  desc: string;
  progress: number;
  status: 'active' | 'achieved';
  target: string;
  otSet: boolean;
}

const INITIAL_GOALS: Goal[] = [
  { id: 1, title: 'Improve sensory regulation before transitions', desc: 'Help Liam manage sensory overload during school pickup and afternoon routine changes.', progress: 60, status: 'active', target: 'Jun 2026', otSet: true },
  { id: 2, title: 'Increase tolerance to tactile input', desc: 'Reduce tactile defensiveness through gradual exposure to varied textures.', progress: 35, status: 'active', target: 'Aug 2026', otSet: true },
  { id: 3, title: 'Establish consistent bedtime routine', desc: 'Dim lighting and calming auditory input nightly to support sleep transitions.', progress: 100, status: 'achieved', target: 'Mar 2026', otSet: false },
];

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${value}%` as any }]} />
    </View>
  );
}

function GoalCard({ goal, onUpdate }: { goal: Goal; onUpdate: (id: number, progress: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isAchieved = goal.status === 'achieved';

  return (
    <View style={[styles.goalCard, isAchieved && styles.goalCardAchieved]}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none"
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            <Path d="M4 6l4 4 4-4" stroke={Colors.textSoft} strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
        </View>
        <View style={styles.goalMeta}>
          <ProgressBar value={goal.progress} />
          <Text style={styles.progressPct}>{goal.progress}%</Text>
        </View>
        <View style={styles.goalBadgeRow}>
          <View style={[styles.statusBadge, isAchieved && styles.statusBadgeAchieved]}>
            <Text style={[styles.statusBadgeText, isAchieved && { color: '#085041' }]}>
              {isAchieved ? 'Achieved' : 'In progress'}
            </Text>
          </View>
          {goal.otSet && (
            <View style={styles.otBadge}><Text style={styles.otBadgeText}>OT set</Text></View>
          )}
          <Text style={styles.targetDate}>Target: {goal.target}</Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.goalExpanded}>
          <Text style={styles.goalDesc}>{goal.desc}</Text>
          <Text style={styles.notesLabel}>Progress notes</Text>
          <TouchableOpacity style={styles.addNoteBtn} activeOpacity={0.8}>
            <Text style={styles.addNoteText}>+ Add a progress note…</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const active = goals.filter(g => g.status === 'active');
  const achieved = goals.filter(g => g.status === 'achieved');

  function updateGoal(id: number, progress: number) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress, status: progress === 100 ? 'achieved' : 'active' } : g));
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>OT Goals</Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+ Add goal</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}><Text style={styles.summaryPillText}>{active.length} active</Text></View>
          <View style={[styles.summaryPill, { backgroundColor: '#E1F5EE', }]}><Text style={[styles.summaryPillText, { color: '#085041' }]}>{achieved.length} achieved</Text></View>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {active.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>In Progress</Text>
            {active.map(g => <GoalCard key={g.id} goal={g} onUpdate={updateGoal} />)}
          </>
        )}
        {achieved.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Achieved</Text>
            {achieved.map(g => <GoalCard key={g.id} goal={g} onUpdate={updateGoal} />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 14, paddingTop: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: Colors.text, letterSpacing: -0.4, fontFamily: 'PlayfairDisplay_600SemiBold' },
  addBtn: { backgroundColor: Colors.light, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryPill: { backgroundColor: Colors.light, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  summaryPillText: { fontSize: 12, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10, fontFamily: 'PlusJakartaSans_600SemiBold' },
  goalCard: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  goalCardAchieved: { backgroundColor: '#F0FAF5', borderColor: '#B8E8D0' },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  goalTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1, marginRight: 8, fontFamily: 'PlusJakartaSans_600SemiBold' },
  goalMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  progressTrack: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  progressPct: { fontSize: 11, fontWeight: '700', color: Colors.dark, fontFamily: 'PlusJakartaSans_700Bold', minWidth: 32 },
  goalBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  statusBadge: { backgroundColor: Colors.amberBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeAchieved: { backgroundColor: '#E1F5EE' },
  statusBadgeText: { fontSize: 10, fontWeight: '600', color: '#633806', fontFamily: 'PlusJakartaSans_600SemiBold' },
  otBadge: { backgroundColor: Colors.light, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  otBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
  targetDate: { fontSize: 11, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  goalExpanded: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 12, paddingTop: 12 },
  goalDesc: { fontSize: 12, color: Colors.textMid, lineHeight: 18, marginBottom: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  notesLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: 'PlusJakartaSans_600SemiBold' },
  addNoteBtn: { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center' },
  addNoteText: { fontSize: 12, color: Colors.textMid, fontFamily: 'PlusJakartaSans_400Regular' },
});
