import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Colors, SensoryColors, type SensorySystem } from '@/constants/theme';
import { SensoryTag } from '@/components/ui/SensoryTag';
import { SourceBadge } from '@/components/ui/SourceBadge';
import { libraryActivities, myActivities, type LibraryActivity } from '@/constants/data';

const FILTERS = ['All', 'Proprioceptive', 'Tactile', 'Vestibular', 'Auditory', 'Visual', 'Interoceptive'] as const;

function LibraryCard({ act, isMine }: { act: LibraryActivity; isMine?: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{act.name}</Text>
        <Text style={styles.duration}>{act.duration} min</Text>
      </View>
      <Text style={styles.cardDesc}>{act.desc}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.tags}>
          <SensoryTag system={act.system} small />
          {isMine && <SourceBadge source="my" />}
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Add to diet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');

  const filtered = filter === 'All'
    ? libraryActivities
    : libraryActivities.filter(a => a.system === filter);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Activity Library</Text>
          <TouchableOpacity style={styles.createBtn} activeOpacity={0.8}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M7 2v10M2 7h10" stroke={Colors.dark} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
          {FILTERS.map(f => {
            const col = f !== 'All' ? SensoryColors[f as SensorySystem] : null;
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.chip,
                  active && { backgroundColor: col ? col.bg : Colors.primary, borderColor: col ? col.bg : Colors.primary },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && { color: col ? col.text : Colors.white, fontWeight: '600' }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {filter === 'All' && (
          <>
            <Text style={styles.sectionLabel}>My Activities</Text>
            {myActivities.map(a => <LibraryCard key={a.id} act={a} isMine />)}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Curated Library</Text>
          </>
        )}
        {filtered.map(a => <LibraryCard key={a.id} act={a} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: Colors.text, letterSpacing: -0.4, fontFamily: 'PlayfairDisplay_600SemiBold' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.light, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  createBtnText: { fontSize: 13, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
  filtersScroll: { marginTop: 0 },
  chip: { flexShrink: 0, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 5 },
  chipText: { fontSize: 12, color: Colors.textMid, fontFamily: 'PlusJakartaSans_400Regular' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10, fontFamily: 'PlusJakartaSans_600SemiBold' },
  card: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 13, paddingHorizontal: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1, marginRight: 8, fontFamily: 'PlusJakartaSans_600SemiBold' },
  duration: { fontSize: 11, color: Colors.textSoft, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium' },
  cardDesc: { fontSize: 12, color: Colors.textMid, lineHeight: 18, marginBottom: 10, fontFamily: 'PlusJakartaSans_400Regular' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tags: { flexDirection: 'row', gap: 6 },
  addBtn: { backgroundColor: Colors.light, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontSize: 12, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
