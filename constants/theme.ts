export const Colors = {
  primary: '#6B8F71',
  dark: '#4A6741',
  light: '#EDF2EE',
  border: '#D4E3D6',
  bg: '#F7FAF7',
  white: '#FFFFFF',
  text: '#1A2A1C',
  textMid: '#4A5E4C',
  textSoft: '#7A907C',
  amber: '#D97B1A',
  amberBg: '#FAEEDA',
} as const;

export const SensoryColors = {
  Proprioceptive: { bg: '#FAECE7', text: '#4A1B0C' },
  Tactile: { bg: '#E1F5EE', text: '#085041' },
  Vestibular: { bg: '#FAEEDA', text: '#633806' },
  Auditory: { bg: '#E6F1FB', text: '#0C447C' },
  Visual: { bg: '#FBEAF0', text: '#4B1528' },
  Interoceptive: { bg: '#EAF3DE', text: '#27500A' },
} as const;

export const BadgeColors = {
  ot: { bg: '#EDF2EE', text: '#4A6741' },
  library: { bg: '#EBF3F5', text: '#2C5566' },
  my: { bg: '#FAEEDA', text: '#633806' },
} as const;

export type SensorySystem = keyof typeof SensoryColors;
export type ActivitySource = keyof typeof BadgeColors;

export const Fonts = {
  display: 'PlayfairDisplay_600SemiBold',
  displayBold: 'PlayfairDisplay_700Bold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
} as const;

export const Radius = {
  card: 14,
  button: 12,
  badge: 20,
  sm: 8,
} as const;

export const Spacing = {
  screenH: 16,
  cardPad: 14,
} as const;
