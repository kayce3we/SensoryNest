import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Switch, Pressable, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface ProgressNote {
  id: string;
  text: string;
  date: string;
}

// target_date is stored as a Postgres date (YYYY-MM-DD) or '—' for "no target date".
function parseTargetDate(target?: string): Date | null {
  if (!target || target === '—') return null;
  const d = new Date(target + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function formatTargetDate(d: Date | null): string {
  return d ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'No target date';
}

function toTargetDateColumn(d: Date | null): string {
  return d ? d.toISOString().split('T')[0] : '—';
}

interface Goal {
  id: string;
  title: string;
  desc: string;
  progress: number;
  status: 'active' | 'achieved';
  target: string;
  otSet: boolean;
  notes: ProgressNote[];
}


function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${value}%` as any }]} />
    </View>
  );
}

function GoalCard({
  goal, onUpdate, onAddNote, onEditNote, onDeleteNote, onEdit, onDelete,
}: {
  goal: Goal;
  onUpdate: (id: string, progress: number) => void;
  onAddNote: (goalId: string) => void;
  onEditNote: (goalId: string, noteId: string, text: string) => void;
  onDeleteNote: (goalId: string, noteId: string) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isAchieved = goal.status === 'achieved';

  return (
    <View style={[styles.goalCard, isAchieved && styles.goalCardAchieved]}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <View style={styles.goalHeaderRight}>
            <TouchableOpacity
              onPress={() => onEdit(goal)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
                <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(goal.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none"
              style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
              <Path d="M4 6l4 4 4-4" stroke={Colors.textSoft} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
          </View>
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
          {goal.target !== '—' && (
            <Text style={styles.targetDate}>Target: {formatTargetDate(parseTargetDate(goal.target))}</Text>
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.goalExpanded}>
          <Text style={styles.goalDesc}>{goal.desc}</Text>
          <Text style={styles.notesLabel}>Progress notes</Text>
          {goal.notes.map(n => (
            <View key={n.id} style={styles.noteRow}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteDate}>{n.date}</Text>
                <View style={styles.noteActions}>
                  <TouchableOpacity onPress={() => onEditNote(goal.id, n.id, n.text)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} activeOpacity={0.7}>
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" />
                      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDeleteNote(goal.id, n.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} activeOpacity={0.7}>
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={Colors.textSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.noteText}>{n.text}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addNoteBtn}
            onPress={() => onAddNote(goal.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.addNoteText}>+ Add a progress note…</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function GoalFormModal({ visible, onClose, onSave, initial }: {
  visible: boolean;
  onClose: () => void;
  onSave: (g: Omit<Goal, 'id' | 'notes'>) => Promise<boolean>;
  initial?: Goal;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [desc, setDesc] = useState(initial?.desc ?? '');
  const [targetDate, setTargetDate] = useState<Date | null>(parseTargetDate(initial?.target));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [otSet, setOtSet] = useState(initial?.otSet ?? false);
  const [progress, setProgress] = useState(String(initial?.progress ?? 0));
  const [saving, setSaving] = useState(false);

  // Sync when initial changes (opening edit)
  React.useEffect(() => {
    setTitle(initial?.title ?? '');
    setDesc(initial?.desc ?? '');
    setTargetDate(parseTargetDate(initial?.target));
    setShowDatePicker(false);
    setOtSet(initial?.otSet ?? false);
    setProgress(String(initial?.progress ?? 0));
  }, [initial, visible]);

  async function handleSave() {
    if (!title.trim() || saving) return;
    const p = Math.min(100, Math.max(0, parseInt(progress) || 0));
    setSaving(true);
    const ok = await onSave({ title: title.trim(), desc: desc.trim(), progress: p, status: p === 100 ? 'achieved' : 'active', target: toTargetDateColumn(targetDate), otSet });
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{initial ? 'Edit goal' : 'Add goal'}</Text>

          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            onFocus={() => setShowDatePicker(false)}
            placeholder="e.g. Improve sensory regulation"
            placeholderTextColor={Colors.textSoft}
            autoFocus={!initial}
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={desc}
            onChangeText={setDesc}
            onFocus={() => setShowDatePicker(false)}
            placeholder="Details about this goal…"
            placeholderTextColor={Colors.textSoft}
            multiline
            numberOfLines={3}
          />

          <View style={styles.rowTwo}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Target date</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => { Keyboard.dismiss(); setShowDatePicker(v => !v); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateBtnText, !targetDate && { color: Colors.textSoft }]}>
                  {formatTargetDate(targetDate)}
                </Text>
              </TouchableOpacity>
              {targetDate && (
                <Text style={styles.clearDateLink} onPress={() => { setTargetDate(null); setShowDatePicker(false); }}>
                  Clear
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Progress %</Text>
              <TextInput
                style={styles.input}
                value={progress}
                onChangeText={setProgress}
                onFocus={() => setShowDatePicker(false)}
                placeholder="0"
                placeholderTextColor={Colors.textSoft}
                keyboardType="numeric"
              />
            </View>
          </View>

          {showDatePicker && Platform.OS === 'ios' && (
            // iOS's spinner has no font-size API of its own, so this is scaled down to
            // sit closer to the app's type scale, with a matching negative margin to
            // remove the blank space the scale leaves behind (transform doesn't shrink layout bounds).
            <View style={styles.datePickerScaleWrap}>
              <DateTimePicker
                value={targetDate ?? new Date()}
                mode="date"
                display="spinner"
                accentColor={Colors.primary}
                onChange={(_, date) => { if (date) setTargetDate(date); }}
                style={{ width: '100%' }}
              />
            </View>
          )}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={targetDate ?? new Date()}
              mode="date"
              display="default"
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setTargetDate(date);
              }}
            />
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>OT set goal</Text>
            <Switch
              value={otSet}
              onValueChange={setOtSet}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, (!title.trim() || saving) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!title.trim() || saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>{initial ? 'Save changes' : 'Save goal'}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddNoteModal({ visible, onClose, onSave, initialText }: {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string) => Promise<boolean>;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText ?? '');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { setText(initialText ?? ''); }, [initialText, visible]);

  async function handleSave() {
    if (!text.trim() || saving) return;
    setSaving(true);
    const ok = await onSave(text.trim());
    setSaving(false);
    if (ok) { setText(''); onClose(); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{initialText ? 'Edit note' : 'Add progress note'}</Text>

          <Text style={styles.fieldLabel}>Note</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={text}
            onChangeText={setText}
            placeholder="What progress have you noticed?"
            placeholderTextColor={Colors.textSoft}
            multiline
            numberOfLines={4}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.saveBtn, (!text.trim() || saving) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!text.trim() || saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>Save note</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [noteTargetId, setNoteTargetId] = useState<string | null>(null);
  const [editNoteTarget, setEditNoteTarget] = useState<{ goalId: string; noteId: string; text: string } | null>(null);

  const active = goals.filter(g => g.status === 'active');
  const achieved = goals.filter(g => g.status === 'achieved');

  useFocusEffect(useCallback(() => { loadGoals(); }, [userId]));

  async function loadGoals() {
    if (!userId) return;
    setLoading(true);
    const { data: goalsData } = await supabase
      .from('goals').select('*').eq('user_id', userId).order('created_at');
    const { data: notesData } = await supabase
      .from('goal_notes').select('*').eq('user_id', userId).order('created_at');
    setGoals((goalsData ?? []).map((g: any) => ({
      id: g.id,
      title: g.title,
      desc: g.description ?? '',
      progress: g.progress,
      status: g.status,
      target: g.target_date ?? '—',
      otSet: g.ot_set,
      notes: (notesData ?? [])
        .filter((n: any) => n.goal_id === g.id)
        .map((n: any) => ({
          id: n.id,
          text: n.note,
          date: new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        })),
    })));
    setLoading(false);
  }

  async function addGoal(g: Omit<Goal, 'id' | 'notes'>): Promise<boolean> {
    if (!userId) return false;
    const { data, error } = await supabase.from('goals').insert({
      user_id: userId,
      title: g.title,
      description: g.desc,
      progress: g.progress,
      status: g.status,
      target_date: g.target !== '—' ? g.target : null,
      ot_set: g.otSet,
    }).select().single();
    if (error || !data) {
      Alert.alert('Couldn\'t save goal', error?.message ?? 'Please try again.');
      return false;
    }
    setGoals(prev => [...prev, { ...g, id: data.id, notes: [] }]);
    return true;
  }

  async function saveEditGoal(g: Omit<Goal, 'id' | 'notes'>): Promise<boolean> {
    if (!editGoal) return false;
    const { error } = await supabase.from('goals').update({
      title: g.title,
      description: g.desc,
      progress: g.progress,
      status: g.status,
      target_date: g.target !== '—' ? g.target : null,
      ot_set: g.otSet,
    }).eq('id', editGoal.id);
    if (error) {
      Alert.alert('Couldn\'t save changes', error.message);
      return false;
    }
    setGoals(prev => prev.map(x => x.id === editGoal.id ? { ...x, ...g } : x));
    return true;
  }

  function deleteGoal(id: string) {
    Alert.alert('Remove goal', 'Remove this goal permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('goals').delete().eq('id', id);
        setGoals(prev => prev.filter(g => g.id !== id));
      }},
    ]);
  }

  async function addNote(goalId: string, text: string): Promise<boolean> {
    if (!userId) return false;
    const { data, error } = await supabase.from('goal_notes').insert({
      goal_id: goalId, user_id: userId, note: text,
    }).select().single();
    if (error || !data) {
      Alert.alert('Couldn\'t save note', error?.message ?? 'Please try again.');
      return false;
    }
    const date = new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, notes: [...g.notes, { id: data.id, text, date }] } : g
    ));
    return true;
  }

  async function saveEditNote(text: string): Promise<boolean> {
    if (!editNoteTarget) return false;
    const { goalId, noteId } = editNoteTarget;
    const { error } = await supabase.from('goal_notes').update({ note: text }).eq('id', noteId);
    if (error) {
      Alert.alert('Couldn\'t save note', error.message);
      return false;
    }
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, notes: g.notes.map(n => n.id === noteId ? { ...n, text } : n) } : g
    ));
    return true;
  }

  function deleteNote(goalId: string, noteId: string) {
    Alert.alert('Remove note', 'Remove this progress note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('goal_notes').delete().eq('id', noteId);
        setGoals(prev => prev.map(g =>
          g.id === goalId ? { ...g, notes: g.notes.filter(n => n.id !== noteId) } : g
        ));
      }},
    ]);
  }

  async function updateGoal(id: string, progress: number) {
    const status = progress === 100 ? 'achieved' : 'active';
    await supabase.from('goals').update({ progress, status }).eq('id', id);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress, status } : g));
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>OT Goals</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddGoal(true)} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+ Add goal</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}><Text style={styles.summaryPillText}>{active.length} active</Text></View>
          <View style={[styles.summaryPill, { backgroundColor: '#E1F5EE' }]}><Text style={[styles.summaryPillText, { color: '#085041' }]}>{achieved.length} achieved</Text></View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : goals.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60, gap: 8 }}>
            <Text style={{ fontSize: 15, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' }}>
              No goals yet.{'\n'}Tap "+ Add goal" to get started.
            </Text>
          </View>
        ) : null}
        {!loading && active.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>In Progress</Text>
            {active.map(g => (
              <GoalCard key={g.id} goal={g} onUpdate={updateGoal} onAddNote={id => setNoteTargetId(id)} onEditNote={(gId, nId, text) => setEditNoteTarget({ goalId: gId, noteId: nId, text })} onDeleteNote={deleteNote} onEdit={setEditGoal} onDelete={deleteGoal} />
            ))}
          </>
        )}
        {!loading && achieved.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Achieved</Text>
            {achieved.map(g => (
              <GoalCard key={g.id} goal={g} onUpdate={updateGoal} onAddNote={id => setNoteTargetId(id)} onEditNote={(gId, nId, text) => setEditNoteTarget({ goalId: gId, noteId: nId, text })} onDeleteNote={deleteNote} onEdit={setEditGoal} onDelete={deleteGoal} />
            ))}
          </>
        )}
      </ScrollView>

      <GoalFormModal visible={showAddGoal} onClose={() => setShowAddGoal(false)} onSave={addGoal} />
      <GoalFormModal visible={editGoal !== null} onClose={() => setEditGoal(null)} onSave={saveEditGoal} initial={editGoal ?? undefined} />
      <AddNoteModal
        visible={noteTargetId !== null}
        onClose={() => setNoteTargetId(null)}
        onSave={text => noteTargetId !== null ? addNote(noteTargetId, text) : Promise.resolve(false)}
      />
      <AddNoteModal
        visible={editNoteTarget !== null}
        onClose={() => setEditNoteTarget(null)}
        onSave={saveEditNote}
        initialText={editNoteTarget?.text}
      />
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
  goalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 },
  rowTwo: { flexDirection: 'row', gap: 10 },
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
  noteRow: { backgroundColor: Colors.bg, borderRadius: 8, padding: 10, marginBottom: 6 },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  noteActions: { flexDirection: 'row', gap: 10 },
  noteDate: { fontSize: 10, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  noteText: { fontSize: 12, color: Colors.textMid, lineHeight: 18, fontFamily: 'PlusJakartaSans_400Regular' },
  addNoteBtn: { borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center' },
  addNoteText: { fontSize: 12, color: Colors.textMid, fontFamily: 'PlusJakartaSans_400Regular' },
  // Sheet / modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 48 },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 16, fontFamily: 'PlayfairDisplay_700Bold' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMid, marginBottom: 6, fontFamily: 'PlusJakartaSans_600SemiBold' },
  input: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text, marginBottom: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  dateBtn: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  dateBtnText: { fontSize: 14, color: Colors.text, fontFamily: 'PlusJakartaSans_400Regular' },
  clearDateLink: { fontSize: 12, color: Colors.textSoft, textDecorationLine: 'underline', marginBottom: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  datePickerScaleWrap: { transform: [{ scale: 0.82 }], marginTop: -20, marginBottom: -12 },
  inputMultiline: { height: 88, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, fontFamily: 'PlusJakartaSans_600SemiBold' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
