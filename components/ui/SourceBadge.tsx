import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { BadgeColors, type ActivitySource } from '@/constants/theme';

const labels: Record<ActivitySource, string> = {
  ot: 'OT prescribed',
  library: 'From library',
  my: 'My activity',
};

export function SourceBadge({ source }: { source: ActivitySource }) {
  const col = BadgeColors[source];
  return (
    <Text style={[styles.base, { backgroundColor: col.bg, color: col.text }]}>
      {labels[source]}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    letterSpacing: 0.1,
  },
});
