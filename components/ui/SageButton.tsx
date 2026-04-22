import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  full?: boolean;
  secondary?: boolean;
  small?: boolean;
}

export function SageButton({ children, onPress, full, secondary, small }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.base,
        full && styles.full,
        secondary ? styles.secondary : styles.primary,
        small && styles.small,
      ]}
    >
      <Text style={[styles.label, secondary && styles.labelSecondary, small && styles.labelSmall]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { width: '100%' },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  small: { paddingVertical: 8, paddingHorizontal: 16 },
  label: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  labelSecondary: { color: Colors.primary },
  labelSmall: { fontSize: 13 },
});
