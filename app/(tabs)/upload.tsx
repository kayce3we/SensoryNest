import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/constants/theme';

const STEPS = [
  'Uploading file',
  'Extracting text',
  'Identifying activities',
  'Categorizing by system',
  'Suggesting times',
];

const EXTRACTED = [
  { name: 'Weighted blanket squeeze', system: 'Proprioceptive' },
  { name: 'Mini trampoline jumps', system: 'Vestibular' },
  { name: 'Playdough squeeze & roll', system: 'Tactile' },
  { name: 'Bear crawl hallway', system: 'Proprioceptive' },
  { name: 'Calm music & headphones', system: 'Auditory' },
];

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'review'>('upload');
  const [stepDone, setStepDone] = useState(0);
  const [selected, setSelected] = useState<boolean[]>(EXTRACTED.map(() => true));
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'processing') return;
    const interval = setInterval(() => {
      setStepDone(s => {
        if (s >= STEPS.length) { clearInterval(interval); setPhase('review'); return s; }
        return s + 1;
      });
    }, 700);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    const spin = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true }));
    spin.start();
    return () => spin.stop();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (phase === 'review') {
    const count = selected.filter(Boolean).length;
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Review Activities</Text>
        </View>
        <View style={{ flex: 1, padding: 16 }}>
          <View style={styles.foundBanner}>
            <Text style={styles.foundText}>We found {EXTRACTED.length} activities</Text>
          </View>
          {EXTRACTED.map((a, i) => (
            <TouchableOpacity key={i} style={styles.reviewRow} onPress={() => setSelected(s => { const n = [...s]; n[i] = !n[i]; return n; })} activeOpacity={0.8}>
              <View style={[styles.checkbox, selected[i] && styles.checkboxChecked]}>
                {selected[i] && <Svg width={12} height={12} viewBox="0 0 12 12" fill="none"><Path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></Svg>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewName}>{a.name}</Text>
                <View style={[styles.reviewTag, { backgroundColor: '#EDF2EE' }]}><Text style={{ fontSize: 10, color: Colors.dark, fontWeight: '600' }}>{a.system}</Text></View>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>Save {count} activities to my diet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'processing') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}><Text style={styles.title}>Processing Plan</Text></View>
        <View style={{ flex: 1, padding: 16 }}>
          <StepIndicator current={1} />
          <View style={{ marginTop: 24 }}>
            {STEPS.map((step, i) => {
              const done = i < stepDone;
              const active = i === stepDone;
              return (
                <View key={i} style={[styles.stepRow, { opacity: i > stepDone ? 0.4 : 1 }]}>
                  <View style={styles.stepIndicator}>
                    {done ? (
                      <View style={styles.stepDone}><Svg width={12} height={12} viewBox="0 0 12 12" fill="none"><Path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></Svg></View>
                    ) : active ? (
                      <Animated.View style={[styles.stepActive, { transform: [{ rotate: spin }] }]} />
                    ) : (
                      <View style={styles.stepPending} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, done && { color: Colors.dark }, active && { color: Colors.amber, fontWeight: '600' }]}>{step}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>Upload OT Plan</Text></View>
      <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
        <StepIndicator current={0} />
        <TouchableOpacity style={styles.dropzone} activeOpacity={0.8} onPress={() => setPhase('processing')}>
          <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
            <Path d="M20 28V16M14 22l6-6 6 6" stroke={Colors.primary} strokeWidth="2" strokeLinecap="round" />
            <Path d="M8 30h24" stroke={Colors.primary} strokeWidth="2" strokeLinecap="round" />
          </Svg>
          <Text style={styles.dropzoneTitle}>Upload your OT plan</Text>
          <Text style={styles.dropzoneSub}>PDF, DOC, or DOCX — up to 10 MB</Text>
          <View style={styles.chooseBtn}><Text style={styles.chooseBtnText}>Choose file</Text></View>
        </TouchableOpacity>
        <View style={styles.privacyNote}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Circle cx="8" cy="8" r="7" stroke={Colors.dark} strokeWidth="1.2" />
            <Path d="M8 7v4M8 5.5v.5" stroke={Colors.dark} strokeWidth="1.2" strokeLinecap="round" />
          </Svg>
          <Text style={styles.privacyText}>Your document is processed securely and never shared with third parties.</Text>
        </View>
      </View>
    </View>
  );
}

function StepIndicator({ current }: { current: number }) {
  const steps = ['Upload', 'Processing', 'Review'];
  return (
    <View style={styles.stepRow2}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <View style={styles.stepDotWrap}>
            <View style={[styles.stepDot2, i <= current && styles.stepDot2Active]}>
              {i < current && <Svg width={12} height={12} viewBox="0 0 12 12" fill="none"><Path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></Svg>}
              {i >= current && <Text style={{ fontSize: 11, color: i === current ? '#fff' : Colors.textSoft, fontWeight: '600' }}>{i + 1}</Text>}
            </View>
            <Text style={[styles.stepDotLabel, i === current && { color: Colors.dark, fontWeight: '600' }]}>{s}</Text>
          </View>
          {i < steps.length - 1 && <View style={[styles.stepConnector, i < current && { backgroundColor: Colors.primary }]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 22, fontWeight: '600', color: Colors.text, letterSpacing: -0.4, fontFamily: 'PlayfairDisplay_600SemiBold' },
  dropzone: { borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 16, backgroundColor: Colors.white, padding: 32, alignItems: 'center', gap: 8, marginBottom: 16 },
  dropzoneTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, fontFamily: 'PlusJakartaSans_600SemiBold' },
  dropzoneSub: { fontSize: 12, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  chooseBtn: { marginTop: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
  chooseBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  privacyNote: { flexDirection: 'row', gap: 10, backgroundColor: Colors.light, borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  privacyText: { fontSize: 12, color: Colors.textMid, flex: 1, lineHeight: 18, fontFamily: 'PlusJakartaSans_400Regular' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  stepIndicator: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stepDone: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepActive: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: Colors.amber, borderTopColor: 'transparent' },
  stepPending: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.border },
  stepLabel: { fontSize: 13, color: Colors.textMid, fontFamily: 'PlusJakartaSans_400Regular' },
  stepRow2: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 32 },
  stepDotWrap: { alignItems: 'center', gap: 6 },
  stepDot2: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  stepDot2Active: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepDotLabel: { fontSize: 11, color: Colors.textSoft, fontFamily: 'PlusJakartaSans_400Regular' },
  stepConnector: { flex: 1, height: 1.5, backgroundColor: Colors.border, marginTop: 16 },
  foundBanner: { backgroundColor: Colors.light, borderRadius: 12, padding: 14, marginBottom: 16 },
  foundText: { fontSize: 15, fontWeight: '600', color: Colors.dark, fontFamily: 'PlusJakartaSans_600SemiBold' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  reviewName: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 4, fontFamily: 'PlusJakartaSans_600SemiBold' },
  reviewTag: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  saveBtn: { marginTop: 16, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
});
