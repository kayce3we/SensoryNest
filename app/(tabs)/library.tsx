import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, SensoryColors, type SensorySystem } from '@/constants/theme';
import { SensoryTag } from '@/components/ui/SensoryTag';
import { SourceBadge } from '@/components/ui/SourceBadge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { suggestActivities, type ExtractedActivity } from '@/lib/ai-extraction';
import type { LibraryActivity } from '@/constants/data';
import { createActivity } from '@/lib/activities';

const SENSORY_SYSTEMS: SensorySystem[] = [
  'Proprioceptive', 'Tactile', 'Vestibular', 'Auditory', 'Visual', 'Interoceptive',
];

const FILTERS = ['All', 'Favorites', 'Proprioceptive', 'Tactile', 'Vestibular', 'Auditory', 'Visual', 'Interoceptive'] as const;

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? '#E57373' : 'none'}>
      <Path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        stroke={filled ? '#E57373' : Colors.textSoft}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type ReactionCounts = { liked: number; neutral: number; disliked: number };

function ReactionSummary({ counts }: { counts: ReactionCounts }) {
  const total = counts.liked + counts.neutral + counts.disliked;
  if (total === 0) return null;
  return (
    <Text style={styles.reactionSummary}>
      {counts.liked > 0 ? `👍 ${counts.liked}  ` : ''}
      {counts.neutral > 0 ? `😐 ${counts.neutral}  ` : ''}
      {counts.disliked > 0 ? `👎 ${counts.disliked}` : ''}
    </Text>
  );
}

function LibraryCard({
  act, isMine, isFavorite, onToggleFavorite, onEdit, onDelete, reactionCounts,
}: {
  act: LibraryActivity;
  isMine?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  reactionCounts?: ReactionCounts;
}) {
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
        <View style={styles.cardHeaderRight}>
          <Text style={styles.duration}>{act.duration} min</Text>
          {onToggleFavorite && (
            <TouchableOpacity onPress={onToggleFavorite} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
              <HeartIcon filled={!!isFavorite} />
            </TouchableOpacity>
          )}
          {isMine && onEdit && (
            <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
                <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          )}
          {isMine && onDelete && (
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {act.desc ? <Text style={styles.cardDesc}>{act.desc}</Text> : null}
      {reactionCounts && <ReactionSummary counts={reactionCounts} />}
      <View style={styles.cardFooter}>
        <View style={styles.tags}>
          <SensoryTag system={act.system} small />
          {act.source === 'my' && <SourceBadge source="my" />}
          {act.source === 'ot' && <SourceBadge source="ot" />}
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
  const [otActivities, setOtActivities] = useState<LibraryActivity[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [otOrder, setOtOrder] = useState<SensorySystem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [reactionCounts, setReactionCounts] = useState<Record<string, ReactionCounts>>({});
  const [reactionByName, setReactionByName] = useState<Record<string, ReactionCounts>>({});
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestPrompt, setSuggestPrompt] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<ExtractedActivity[]>([]);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const cachedSuggestPrompt = useRef<string>('');
  const [childProfile, setChildProfile] = useState<{ name?: string; age?: number; notes?: string; otNotes?: string }>({});

  function favKey(userId: string) { return `favorites_${userId}`; }

  async function loadFavorites() {
    if (!userId) return;
    const raw = await AsyncStorage.getItem(favKey(userId));
    setFavorites(new Set(raw ? JSON.parse(raw) : []));
  }

  async function toggleFavorite(key: string) {
    if (!userId) return;
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      AsyncStorage.setItem(favKey(userId), JSON.stringify([...next]));
      return next;
    });
  }

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    setLoadingMine(true);
    loadFavorites();
    AsyncStorage.getItem(`ot_sensory_order_${userId}`).then(v => {
      if (v) setOtOrder(JSON.parse(v) as SensorySystem[]);
    });
    supabase.from('profiles').select('child_name, child_age, child_notes, ot_notes').eq('id', userId).single()
      .then(({ data }) => {
        setChildProfile({
          name: data?.child_name ?? undefined,
          age: data?.child_age ?? undefined,
          notes: data?.child_notes ?? undefined,
          otNotes: data?.ot_notes ?? undefined,
        });
      });
    supabase
      .from('activities')
      .select('id, name, description, sensory_system, duration, source')
      .eq('user_id', userId)
      .in('source', ['my', 'ot', 'ai'])
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const mapped = (data ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          desc: r.description ?? '',
          system: r.sensory_system as SensorySystem,
          duration: r.duration,
          source: r.source,
        }));
        setMyActivities(mapped.filter(a => a.source === 'my' || a.source === 'ai'));
        setOtActivities(mapped.filter(a => a.source === 'ot'));
        setLoadingMine(false);
      });

    supabase
      .from('scheduled_activities')
      .select('activity_id, reaction, activity:activities(name)')
      .eq('user_id', userId)
      .eq('status', 'done')
      .not('reaction', 'is', null)
      .then(({ data }) => {
        const byId: Record<string, ReactionCounts> = {};
        const byName: Record<string, ReactionCounts> = {};
        (data ?? []).forEach((r: any) => {
          if (!r.reaction) return;
          const inc = (map: Record<string, ReactionCounts>, key: string) => {
            if (!map[key]) map[key] = { liked: 0, neutral: 0, disliked: 0 };
            if (r.reaction === 'liked') map[key].liked++;
            else if (r.reaction === 'neutral') map[key].neutral++;
            else if (r.reaction === 'disliked') map[key].disliked++;
          };
          if (r.activity_id) inc(byId, String(r.activity_id));
          if (r.activity?.name) inc(byName, r.activity.name);
        });
        setReactionCounts(byId);
        setReactionByName(byName);
      });
  }, [userId]));

  async function handleSuggest() {
    if (!suggestPrompt.trim()) return;
    Keyboard.dismiss();
    // Return cached results if the prompt hasn't changed
    if (suggestPrompt.trim() === cachedSuggestPrompt.current && suggestions.length > 0) return;
    setSuggesting(true);
    setSuggestions([]);
    setAddedIds(new Set());
    try {
      const results = await suggestActivities(suggestPrompt, {
        childName: childProfile.name,
        childAge: childProfile.age,
        childNotes: childProfile.notes,
        otNotes: childProfile.otNotes,
        sensoryOrder: otOrder,
      });
      cachedSuggestPrompt.current = suggestPrompt.trim();
      setSuggestions(results);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleAddSuggestion(index: number) {
    if (!userId) return;
    const s = suggestions[index];
    try {
      await createActivity({
        user_id: userId,
        name: s.name,
        description: s.description,
        sensory_system: s.sensory_system,
        source: 'ai',
        duration: s.duration,
        is_library: false,
      });
      setAddedIds(prev => new Set([...prev, index]));
      const { data } = await supabase
        .from('activities').select('id, name, description, sensory_system, duration, source')
        .eq('user_id', userId).eq('source', 'ai').order('created_at', { ascending: false });
      setMyActivities(prev => [
        ...(data ?? []).map((r: any) => ({
          id: r.id, name: r.name, desc: r.description ?? '',
          system: r.sensory_system as SensorySystem, duration: r.duration, source: r.source,
        })),
        ...prev.filter(a => a.source !== 'ai'),
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  const isFavoritesFilter = filter === 'Favorites';

  const q = searchQuery.toLowerCase().trim();

  const filteredMine = myActivities
    .filter(a => !isFavoritesFilter || favorites.has(String(a.id)))
    .filter(a => filter === 'All' || isFavoritesFilter || a.system === filter)
    .filter(a => !q || a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));

  const filteredOt = otActivities
    .filter(a => !isFavoritesFilter || favorites.has(String(a.id)))
    .filter(a => filter === 'All' || isFavoritesFilter || a.system === filter)
    .filter(a => !q || a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Activity Library</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.suggestBtn}
              onPress={() => { setShowSuggest(true); setSuggestions([]); setSuggestPrompt(''); setAddedIds(new Set()); }}
              activeOpacity={0.8}
            >
              <Text style={styles.suggestBtnText}>✦ Suggest</Text>
            </TouchableOpacity>
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
        </View>
        <View style={styles.searchRow}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <Path d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
          </Svg>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search activities…"
            placeholderTextColor={Colors.textSoft}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
          {FILTERS.map(f => {
            const isSensory = f !== 'All' && f !== 'Favorites';
            const col = isSensory ? SensoryColors[f as SensorySystem] : null;
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.chip, active && { backgroundColor: col ? col.bg : Colors.primary, borderColor: col ? col.bg : Colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && { color: col ? col.text : Colors.white, fontWeight: '600' }]}>
                  {f === 'Favorites' ? '♥ Favorites' : f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* OT Recommended Order banner */}
        {otOrder.length > 0 && (
          <View style={styles.otOrderBanner}>
            <Text style={styles.otOrderLabel}>OT Recommended Order</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.otOrderRow}>
              {otOrder.map((s, i) => {
                const col = SensoryColors[s];
                return (
                  <View key={`${s}-${i}`} style={styles.otOrderItem}>
                    <View style={[styles.otOrderBadge, { backgroundColor: col.bg }]}>
                      <Text style={[styles.otOrderNum, { color: col.text }]}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.otOrderText, { color: col.text, backgroundColor: col.bg }]}>{s}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Favorites empty state */}
        {isFavoritesFilter && filteredMine.length === 0 && filteredOt.length === 0 && (
          <View style={[styles.emptyMine, { marginTop: 8 }]}>
            <Text style={styles.emptyMineText}>Tap the ♥ on any activity to add it here</Text>
          </View>
        )}

        {/* My Activities */}
        {(!isFavoritesFilter || filteredMine.length > 0) && (filter === 'All' || filteredMine.length > 0) && (
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
            {filteredMine.map(a => (
              <LibraryCard
                key={a.id}
                act={a}
                isMine
                isFavorite={favorites.has(String(a.id))}
                onToggleFavorite={() => toggleFavorite(String(a.id))}
                reactionCounts={reactionCounts[String(a.id)]}
                onEdit={() => router.push({ pathname: '/edit-activity', params: { id: String(a.id) } })}
                onDelete={() => Alert.alert(
                  'Remove activity',
                  `Remove "${a.name}" from your library?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove', style: 'destructive', onPress: async () => {
                        await supabase.from('activities').delete().eq('id', String(a.id));
                        setMyActivities(prev => prev.filter(x => x.id !== a.id));
                      },
                    },
                  ]
                )}
              />
            ))}
          </>
        )}

        {/* OT Plan Activities */}
        {(!isFavoritesFilter || filteredOt.length > 0) && (filter === 'All' || filteredOt.length > 0) && (
          <>
            <View style={[styles.sectionRow, { marginTop: 20 }]}>
              <Text style={styles.sectionLabel}>Prescribed by OT</Text>
              {loadingMine && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>
            {!loadingMine && filteredOt.length === 0 ? (
              <View style={styles.emptyMine}>
                <Text style={styles.emptyMineText}>Upload a home program to see activities here</Text>
              </View>
            ) : (
              filteredOt.map(a => (
                <LibraryCard
                  key={a.id}
                  act={a}
                  isMine
                  isFavorite={favorites.has(String(a.id))}
                  onToggleFavorite={() => toggleFavorite(String(a.id))}
                  reactionCounts={reactionCounts[String(a.id)]}
                  onEdit={() => router.push({ pathname: '/edit-activity', params: { id: String(a.id) } })}
                  onDelete={() => Alert.alert(
                    'Remove activity',
                    `Remove "${a.name}" from your library?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove', style: 'destructive', onPress: async () => {
                          await supabase.from('activities').delete().eq('id', String(a.id));
                          setOtActivities(prev => prev.filter(x => x.id !== a.id));
                        },
                      },
                    ]
                  )}
                />
              ))
            )}
          </>
        )}

      </ScrollView>

      {/* Suggest Sheet */}
      <Modal visible={showSuggest} transparent animationType="slide" onRequestClose={() => setShowSuggest(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => setShowSuggest(false)} />
          <View style={styles.sheet}>
            {/* Header row — always visible */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetTopRow}>
                <Text style={styles.sheetTitle}>
                  {suggestions.length > 0 ? 'Suggestions' : 'Suggest an activity'}
                </Text>
                <TouchableOpacity onPress={() => setShowSuggest(false)} style={styles.sheetCloseBtn} activeOpacity={0.7}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path d="M18 6L6 18M6 6l12 12" stroke={Colors.textMid} strokeWidth="2" strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              </View>

              {/* Input area — full when no results, compact when results exist */}
              {suggestions.length === 0 ? (
                <>
                  <Text style={styles.sheetSub}>
                    Describe what you need and we'll suggest activities tailored to{childProfile.name ? ` ${childProfile.name}` : ' your child'}.
                  </Text>
                  <TextInput
                    style={styles.sheetInput}
                    value={suggestPrompt}
                    onChangeText={setSuggestPrompt}
                    placeholder="e.g. something calming before bedtime, heavy work for after school…"
                    placeholderTextColor={Colors.textSoft}
                    multiline
                    numberOfLines={3}
                    returnKeyType="done"
                    onSubmitEditing={handleSuggest}
                  />
                  <TouchableOpacity
                    style={[styles.sheetBtn, (suggesting || !suggestPrompt.trim()) && { opacity: 0.5 }]}
                    onPress={handleSuggest}
                    disabled={suggesting || !suggestPrompt.trim()}
                    activeOpacity={0.85}
                  >
                    {suggesting
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.sheetBtnText}>Get suggestions</Text>
                    }
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.sheetCompactRow}>
                  <Text style={styles.sheetCompactPrompt} numberOfLines={1}>"{suggestPrompt}"</Text>
                  <TouchableOpacity
                    onPress={() => { setSuggestions([]); setAddedIds(new Set()); cachedSuggestPrompt.current = ''; }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sheetCompactEdit}>Try again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Scrollable results */}
            {suggestions.length > 0 && (
              <ScrollView style={styles.sheetResults} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {suggestions.map((s, i) => (
                  <View key={i} style={styles.suggestionCard}>
                    <View style={styles.suggestionHeader}>
                      <Text style={styles.suggestionName}>{s.name}</Text>
                      <Text style={styles.suggestionMeta}>{s.sensory_system} · {s.duration} min</Text>
                    </View>
                    <Text style={styles.suggestionDesc}>{s.description}</Text>
                    <TouchableOpacity
                      style={[styles.addSuggestionBtn, addedIds.has(i) && styles.addSuggestionBtnDone]}
                      onPress={() => handleAddSuggestion(i)}
                      disabled={addedIds.has(i)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.addSuggestionBtnText, addedIds.has(i) && { color: Colors.primary }]}>
                        {addedIds.has(i) ? '✓ Added to library' : '+ Add to library'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.light, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, fontFamily: 'PlusJakartaSans_400Regular', padding: 0 },
  filtersScroll: { marginTop: 0 },
  chip: { flexShrink: 0, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 5 },
  chipText: { fontSize: 12, color: Colors.textMid, fontFamily: 'PlusJakartaSans_400Regular' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.9, fontFamily: 'PlusJakartaSans_600SemiBold' },
  emptyMine: { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  emptyMineText: { fontSize: 13, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  card: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 13, paddingHorizontal: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1, marginRight: 8, fontFamily: 'PlusJakartaSans_600SemiBold' },
  duration: { fontSize: 11, color: Colors.textSoft, fontWeight: '500', fontFamily: 'PlusJakartaSans_500Medium' },
  cardDesc: { fontSize: 12, color: Colors.textMid, lineHeight: 18, marginBottom: 6, fontFamily: 'PlusJakartaSans_400Regular' },
  reactionSummary: { fontSize: 12, color: Colors.textSoft, marginBottom: 8, fontFamily: 'PlusJakartaSans_400Regular' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tags: { flexDirection: 'row', gap: 6 },
  addBtn: { backgroundColor: Colors.light, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontSize: 12, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
  otOrderBanner: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 12, marginBottom: 16 },
  otOrderLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSoft, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10, fontFamily: 'PlusJakartaSans_600SemiBold' },
  otOrderRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  otOrderItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  otOrderBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  otOrderNum: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  otOrderText: { fontSize: 11, fontWeight: '500', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, fontFamily: 'PlusJakartaSans_500Medium' },
  suggestBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEE8F5', borderWidth: 1, borderColor: '#D4C5E8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  suggestBtnText: { fontSize: 13, fontWeight: '600', color: '#5B3F7A', fontFamily: 'PlusJakartaSans_600SemiBold' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', overflow: 'hidden' },
  sheetHeader: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, fontFamily: 'PlayfairDisplay_700Bold' },
  sheetSub: { fontSize: 13, color: Colors.textMid, marginBottom: 14, lineHeight: 19, fontFamily: 'PlusJakartaSans_400Regular' },
  sheetInput: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.text, minHeight: 76, textAlignVertical: 'top', marginBottom: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  sheetBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  sheetBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  sheetCompactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sheetCompactPrompt: { flex: 1, fontSize: 13, color: Colors.textMid, fontStyle: 'italic', fontFamily: 'PlusJakartaSans_400Regular' },
  sheetCompactEdit: { fontSize: 13, fontWeight: '600', color: Colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  sheetResults: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 },
  suggestionCard: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  suggestionName: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1, marginRight: 8, fontFamily: 'PlusJakartaSans_600SemiBold' },
  suggestionMeta: { fontSize: 11, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  suggestionDesc: { fontSize: 12, color: Colors.textMid, lineHeight: 18, marginBottom: 10, fontFamily: 'PlusJakartaSans_400Regular' },
  addSuggestionBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  addSuggestionBtnDone: { backgroundColor: Colors.light, borderWidth: 1, borderColor: Colors.border },
  addSuggestionBtnText: { fontSize: 13, fontWeight: '600', color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
