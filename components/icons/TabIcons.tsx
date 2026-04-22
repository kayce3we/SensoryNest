import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Colors } from '@/constants/theme';

interface IconProps {
  active: boolean;
  size?: number;
}

export function HomeIcon({ active, size = 22 }: IconProps) {
  const color = active ? Colors.primary : Colors.textSoft;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth="1.8" fill={active ? Colors.light : 'none'} />
      <Path d="M9 21V12h6v9" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

export function LibraryIcon({ active, size = 22 }: IconProps) {
  const color = active ? Colors.primary : Colors.textSoft;
  const fill = active ? Colors.light : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill={fill} />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill={fill} />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill={fill} />
      <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill={fill} />
    </Svg>
  );
}

export function UploadIcon({ active, size = 22 }: IconProps) {
  const color = active ? Colors.primary : Colors.textSoft;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 16V8M8 12l4-4 4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M5 20h14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="1.8" fill={active ? Colors.light : 'none'} />
    </Svg>
  );
}

export function GoalsIcon({ active, size = 22 }: IconProps) {
  const color = active ? Colors.primary : Colors.textSoft;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill={active ? Colors.light : 'none'} />
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx="12" cy="12" r="2" fill={color} />
    </Svg>
  );
}

export function HistoryIcon({ active, size = 22 }: IconProps) {
  const color = active ? Colors.primary : Colors.textSoft;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill={active ? Colors.light : 'none'} />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}
