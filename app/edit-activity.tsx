import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Colors, SensoryColors, type SensorySystem } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { SensoryTag } from '@/components/ui/SensoryTag';

const SENSORY_SYSTEMS: SensorySystem[] = [
  'Proprioceptive', 'Tactile', 'Vestibular', 'Auditory', 'Visual', 'Interoceptive',
];

const DURATIONS = [5, 10, 15, 20, 30, 45];

export default function EditActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [system, setSystem] = useState<SensorySystem | null>(null);
  const [duration, setDuration] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('activities')
      .select('name, description, sensory_system, duration')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { Alert.alert('Error', 'Could not load activity.'); router.back(); return; }
        setName(data.name ?? '');
        setDesc(data.description ?? '');
        setSystem(data.sensory_system as SensorySystem);
        setDuration(data.duration ?? 10);
        setLoading(false);
      });
  }, [id]);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter a name.'); return; }
    if (!system) { Alert.alert('Sensory system required', 'Please select a sensory system.'); return; }

    setSaving(true);
    const { error } = await supabase
      .from('activities')
      .update({
        name: name.trim(),
        description: desc.trim() || null,
        sensory_system: system,
        duration,
      })
      .eq('id', id);
    setSaving(false);

    if (error) { Alert.alert('Error', error.message); return; }
    router.back();
  }

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Path d="M12 4l-6 6 6 6" stroke={Colors.text} strokeWidth="1.8" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Activity</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Activity name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Wall push-ups"
          placeholderTextColor={Colors.textSoft}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={desc}
          onChangeText={setDesc}
          placeholder="What does this activity involve?"
          placeholderTextColor={Colors.textSoft}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Sensory system *</Text>
        <View style={styles.chipGrid}>
          {SENSORY_SYSTEMS.map(s => {
            const active = system === s;
            const col = SensoryColors[s];
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setSystem(s)}
                style={[styles.chip, active && { backgroundColor: col.bg, borderColor: col.bg }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && { color: col.text, fontFamily: 'PlusJakartaSans_600SemiBold' }]}>
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {system && <View style={{ marginTop: 8 }}><SensoryTag system={system} /></View>}

        <Text style={[styles.label, { marginTop: 20 }]}>Duration</Text>
        <View style={styles.durationGrid}>
          {DURATIONS.map(d => (
            <TouchableOpacity
              key={d}
              onPress={() => setDuration(d)}
              style={[styles.durationBtn, duration === d && styles.durationBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.durationText, duration === d && styles.durationTextActive]}>
                {d} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Save changes</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 22, fontWeight: '600', color: Colors.text, letterSpacing: -0.4, fontFamily: 'PlayfairDisplay_600SemiBold' },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textMid, marginBottom: 8, fontFamily: 'PlusJakartaSans_600SemiBold' },
  input: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.text, marginBottom: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  inputMultiline: { height: 88, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.white,
  },
  chipText: { fontSize: 13, color: Colors.textMid, fontFamily: 'PlusJakartaSans_400Regular' },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  durationBtn: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  durationBtnActive: { backgroundColor: Colors.light, borderColor: Colors.primary },
  durationText: { fontSize: 13, color: Colors.textMid, fontFamily: 'PlusJakartaSans_500Medium' },
  durationTextActive: { color: Colors.dark, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
