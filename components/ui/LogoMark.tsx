import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/constants/theme';

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <Path d="M6 30 Q22 8 38 30" stroke={Colors.primary} strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.4} />
      <Path d="M10 33 Q22 14 34 33" stroke={Colors.primary} strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.7} />
      <Path d="M14 36 Q22 20 30 36" stroke={Colors.dark} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Circle cx="22" cy="36" r="3.5" fill={Colors.dark} />
      <Path d="M26 14 Q32 8 36 10 Q34 16 28 18 Q26 14 26 14Z" fill={Colors.primary} />
    </Svg>
  );
}
