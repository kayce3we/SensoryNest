import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Colors, SensoryColors, type SensorySystem } from '@/constants/theme';
import { SensoryTag } from '@/components/ui/SensoryTag';
import { SourceBadge } from '@/components/ui/SourceBadge';
import { libraryActivities, type LibraryActivity } from '@/constants/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const FILTERS = ['All', 'Proprioceptive', 'Tactile', 'Vestibular', 'Auditory', 'Visual', 'Interoceptive'] as const;

function LibraryCard({ act, isMine }: { act: LibraryActivity; isMine?: boolean }) {
  const router = useRouter();

  function handleAddToDiet() {
    router.push({
      pathname: '/schedule',
      params: {
        name: act.name,
        desc: act.desc ?? '',
        system: act.system,
        duration: String(act.duration),
      },
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{act.name}</Text>
        <Text style={styles.duration}>{act.duration} min</Text>
      </View>
      {act.desc ? <Text style={styles.cardDesc}>{act.desc}</Text> : null}
      <View style={styles.cardFooter}>
        <View style={styles.tags}>
          <SensoryTag system={act.system} small />
          {isMine && <SourceBadge source="my" />}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddToDiet} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Add to diet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');
  const [myActivities, setMyActivities] = useState<LibraryActivity[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    setLoadingMine(true);
    supabase
      .from('activities')
      .select('id, name, description, sensory_system, duration, source')
      .eq('user_id', userId)
      .eq('source', 'my')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMyActivities((data ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          desc: r.description ?? '',
          system: r.sensory_system as SensorySystem,
          duration: r.duration,
          source: r.source,
        })));
        setLoadingMine(false);
      });
  }, [userId]));

  const filteredLibrary = filter === 'All'
    ? libraryActivities
    : libraryActivities.filter(a => a.system === filter);

  const filteredMine = filter === 'All'
    ? myActivities
    : myActivities.filter(a => a.system === filter);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Activity Library</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/new-activity')}
            activeOpacity={0.8}
          >
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M7 2v10M2 7h10" stroke={Colors.dark} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
          {FILTERS.map(f => {
            const col = f !== 'All' ? SensoryColors[f as SensorySystem] : null;
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.chip, active && { backgroundColor: col ? col.bg : Colors.primary, borderColor: col ? col.bg : Colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && { color: col ? col.text : Colors.white, fontWeight: '600' }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* My Activities */}
        {(filter === 'All' || filteredMine.length > 0) && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>My Activities</Text>
              {loadingMine && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>
            {!loadingMine && filteredMine.length === 0 && (
              <TouchableOpacity style={styles.emptyMine} onPress={() => router.push('/new-activity')} activeOpacity={0.8}>
                <Text style={styles.emptyMineText}>+ Create your first activity</Text>
              </TouchableOpacity>
            )}
            {filteredMine.map(a => <LibraryCard key={a.id} act={a} isMine />)}
          </>
        )}

        {/* Curated library */}
        <Text style={[styles.sectionLabel, { marginTop: filteredMine.length > 0 || filter === 'All' ? 20 : 0 }]}>
          Curated Library
        </Text>
        {filteredLibrary.map(a => <LibraryCard key={a.id} act={a} />)}
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
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.9, fontFamily: 'PlusJakartaSans_600SemiBold' },
  emptyMine: { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  emptyMineText: { fontSize: 13, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
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
