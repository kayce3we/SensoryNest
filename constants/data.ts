import type { SensorySystem, ActivitySource } from './theme';

export type ActivityStatus = 'done' | 'next' | 'pending';

export interface Activity {
  id: number;
  name: string;
  desc: string;
  system: SensorySystem;
  source: ActivitySource;
  duration: number;
  status: ActivityStatus;
  time: string;
}

export interface LibraryActivity {
  id: number;
  name: string;
  desc: string;
  system: SensorySystem;
  duration: number;
  source?: ActivitySource;
}

export const initialActivities: Activity[] = [
  { id: 1, name: 'Weighted blanket squeeze', desc: 'Use the weighted blanket for deep pressure input before transitions.', system: 'Proprioceptive', source: 'ot', duration: 5, status: 'done', time: '8:00 AM' },
  { id: 2, name: 'Mini trampoline jumps', desc: '20 jumps on the trampoline, arms out for balance.', system: 'Vestibular', source: 'ot', duration: 10, status: 'next', time: '10:30 AM' },
  { id: 3, name: 'Playdough squeeze & roll', desc: 'Knead and roll a ball of playdough with both hands.', system: 'Tactile', source: 'library', duration: 8, status: 'pending', time: '12:00 PM' },
  { id: 4, name: 'Bear crawl hallway', desc: 'Bear crawl to the end of the hallway and back, three times.', system: 'Proprioceptive', source: 'ot', duration: 5, status: 'pending', time: '3:30 PM' },
  { id: 5, name: 'Calm music & headphones', desc: 'Listen to preferred calming playlist with noise-canceling headphones.', system: 'Auditory', source: 'library', duration: 10, status: 'pending', time: '6:00 PM' },
];

export const libraryActivities: LibraryActivity[] = [
  { id: 10, name: 'Wall push-ups', desc: "Stand arm's length from wall and do 10 slow push-ups.", system: 'Proprioceptive', duration: 5 },
  { id: 11, name: 'Spinning chair', desc: 'Slow spins in an office chair, 5 rotations each direction.', system: 'Vestibular', duration: 5 },
  { id: 12, name: 'Finger painting', desc: 'Explore different textures through finger painting on paper.', system: 'Tactile', duration: 15 },
  { id: 13, name: 'Bubble wrap popping', desc: 'Pop bubble wrap with fingers – satisfying tactile feedback.', system: 'Tactile', duration: 5 },
  { id: 14, name: 'Nature sounds', desc: 'Play forest or rain sounds at low volume during quiet time.', system: 'Auditory', duration: 10 },
  { id: 15, name: 'Dim lights wind-down', desc: 'Lower room lights 30 min before bed for visual calm.', system: 'Visual', duration: 30 },
  { id: 16, name: 'Body scan breathing', desc: 'Lie flat and notice each body part from toes to head.', system: 'Interoceptive', duration: 8 },
  { id: 17, name: 'Jumping jacks', desc: '10–20 jumping jacks to activate the vestibular system.', system: 'Vestibular', duration: 5 },
];

export const myActivities: LibraryActivity[] = [
  { id: 20, name: 'Swing in backyard', desc: 'Use the outdoor swing for 10 minutes of gentle vestibular input.', system: 'Vestibular', duration: 10, source: 'my' },
];
