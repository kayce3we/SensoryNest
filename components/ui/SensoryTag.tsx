import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SensoryColors, type SensorySystem } from '@/constants/theme';

interface Props {
  system: SensorySystem;
  small?: boolean;
}

export function SensoryTag({ system, small }: Props) {
  const col = SensoryColors[system] ?? { text: '#333', dot: '#999' };
  const size = small ? 7 : 8;
  return (
    <View style={styles.row}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col.dot }} />
      <Text style={[styles.label, { color: col.text, fontSize: small ? 10 : 11 }]}>{system}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
