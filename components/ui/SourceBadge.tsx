import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, type ActivitySource } from '@/constants/theme';

const labels: Record<ActivitySource, string> = {
  ot: 'OT prescribed',
  library: 'From library',
  my: 'My activity',
  ai: 'Suggested',
};

function SourceIcon({ source }: { source: ActivitySource }) {
  const s = Colors.textSoft;
  switch (source) {
    case 'ot':
      return (
        <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
          <Path d="M2.75 1.5h4L9.25 4v6.5h-6.5V1.5z" stroke={s} strokeWidth="1.1" strokeLinejoin="round" />
          <Path d="M6.75 1.5V4h2.5M4.5 6.25h3M4.5 8.25h2" stroke={s} strokeWidth="1.1" strokeLinecap="round" />
        </Svg>
      );
    case 'library':
      return (
        <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
          <Path d="M3 1.75h6v8.5L6 8.4l-3 1.85V1.75z" stroke={s} strokeWidth="1.2" strokeLinejoin="round" />
        </Svg>
      );
    case 'my':
      return (
        <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
          <Path d="M8.3 1.7l2 2L4.6 9.4l-2.6.6.6-2.6 5.7-5.7z" stroke={s} strokeWidth="1.2" strokeLinejoin="round" />
        </Svg>
      );
    case 'ai':
      return (
        <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
          <Path d="M6 1.4l1.2 3.4L10.6 6 7.2 7.2 6 10.6 4.8 7.2 1.4 6l3.4-1.2L6 1.4z" stroke={s} strokeWidth="1.2" strokeLinejoin="round" />
        </Svg>
      );
  }
}

export function SourceBadge({ source }: { source: ActivitySource }) {
  return (
    <View style={styles.row}>
      <SourceIcon source={source} />
      <Text style={styles.label}>{labels[source]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textSoft,
    letterSpacing: 0.1,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
});
