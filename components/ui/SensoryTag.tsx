import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SensoryColors, type SensorySystem } from '@/constants/theme';

interface Props {
  system: SensorySystem;
  small?: boolean;
}

export function SensoryTag({ system, small }: Props) {
  const col = SensoryColors[system] ?? { bg: '#eee', text: '#333' };
  return (
    <Text style={[styles.base, { backgroundColor: col.bg, color: col.text, fontSize: small ? 10 : 11 }]}>
      {system}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    fontWeight: '600',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    letterSpacing: 0.1,
  },
});
