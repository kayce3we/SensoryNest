import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { SensorySystem } from '@/constants/theme';

export interface Activity {
  id: string;
  name: string;
  desc: string;
  system: string;
  source: 'ot' | 'library' | 'my' | 'ai';
  duration: number;
  status: 'done' | 'skipped' | 'next' | 'pending';
  time: string | null;
  scheduledId: string;
  sortOrder: number;
}

interface ActivitiesContextValue {
  activities: Activity[];
  loading: boolean;
  otSensoryOrder: SensorySystem[];
  refreshedOrder: string[];
  refresh: () => Promise<void>;
  markDone: (scheduledId: string) => Promise<void>;
  unmarkDone: (scheduledId: string) => Promise<void>;
  skipActivity: (scheduledId: string) => Promise<void>;
  unskipActivity: (scheduledId: string) => Promise<void>;
  deleteScheduled: (scheduledId: string) => Promise<void>;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  restoreOrder: (originalOrder: string[]) => void;
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

// Exported so the UI can show a passive "missed" cue without duplicating this parsing.
export function parseTimeToMinutes(t: string): number {
  const [time, period] = t.split(' ');
  const [h, m] = time.split(':').map(Number);
  let hours = h % 12;
  if (period === 'PM') hours += 12;
  return hours * 60 + (m || 0);
}

function assignOtRanks(activities: Activity[], otOrder: SensorySystem[]): Map<string, number> {
  const ranks = new Map<string, number>();

  // Group same-time activities
  const byTime = new Map<string, Activity[]>();
  for (const a of activities) {
    const key = a.time ?? '__none__';
    if (!byTime.has(key)) byTime.set(key, []);
    byTime.get(key)!.push(a);
  }

  for (const [key, group] of byTime) {
    if (group.length <= 1 || key === '__none__' || otOrder.length === 0) {
      for (const a of group) ranks.set(a.scheduledId, a.sortOrder);
      continue;
    }

    // Walk OT order, consuming one activity per matching system
    const remaining = [...group];
    const assigned = new Map<string, number>();
    for (let i = 0; i < otOrder.length; i++) {
      const idx = remaining.findIndex(a => a.system === otOrder[i]);
      if (idx !== -1) {
        assigned.set(remaining[idx].scheduledId, i);
        remaining.splice(idx, 1);
      }
    }
    // Anything not in OT order falls back to sort_order
    for (const a of remaining) assigned.set(a.scheduledId, 1000 + a.sortOrder);
    for (const [id, rank] of assigned) ranks.set(id, rank);
  }

  return ranks;
}

function computeStatuses(activities: Activity[]): Activity[] {
  let nextAssigned = false;
  return activities.map(a => {
    if (a.status === 'done' || a.status === 'skipped') return a;
    if (!nextAssigned) {
      nextAssigned = true;
      return { ...a, status: 'next' as const };
    }
    return { ...a, status: 'pending' as const };
  });
}

export function ActivitiesProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [otSensoryOrder, setOtSensoryOrder] = useState<SensorySystem[]>([]);
  const [refreshedOrder, setRefreshedOrder] = useState<string[]>([]);

  async function refresh() {
    if (!userId) { setActivities([]); setLoading(false); return; }
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem(`ot_sensory_order_${userId}`);
      const otOrder: SensorySystem[] = stored ? JSON.parse(stored) : [];
      setOtSensoryOrder(otOrder);

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('scheduled_activities')
        .select('*, activity:activities(*)')
        .eq('user_id', userId)
        .eq('scheduled_date', today)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const mapped: Activity[] = (data ?? []).map((row: any) => ({
        id: row.activity.id,
        scheduledId: row.id,
        name: row.activity.name,
        desc: row.activity.description ?? '',
        system: row.activity.sensory_system,
        source: row.activity.source as 'ot' | 'library' | 'my' | 'ai',
        duration: row.activity.duration,
        status: row.status as 'done' | 'skipped' | 'next' | 'pending',
        time: row.scheduled_time,
        sortOrder: row.sort_order,
      }));

      const otRanks = assignOtRanks(mapped, otOrder);
      const sorted = mapped.sort((a, b) => {
        if (a.time && b.time) {
          const timeDiff = parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
          if (timeDiff !== 0) return timeDiff;
          return (otRanks.get(a.scheduledId) ?? 999) - (otRanks.get(b.scheduledId) ?? 999);
        }
        if (a.time) return -1;
        if (b.time) return 1;
        return a.sortOrder - b.sortOrder;
      });
      setRefreshedOrder(sorted.map(a => a.scheduledId));
      setActivities(computeStatuses(sorted));
    } catch (e) {
      console.error('Failed to load activities', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [userId]);

  async function markDone(scheduledId: string) {
    // Optimistically update UI first
    setActivities(prev => computeStatuses(prev.map(a =>
      a.scheduledId === scheduledId ? { ...a, status: 'done' } : a
    )));
    const { error } = await supabase
      .from('scheduled_activities')
      .update({ status: 'done' })
      .eq('id', scheduledId);
    if (error) {
      // Revert on failure
      console.error('markDone failed:', error.message);
      await refresh();
    }
  }

  async function deleteScheduled(scheduledId: string) {
    setActivities(prev => computeStatuses(prev.filter(a => a.scheduledId !== scheduledId)));
    setRefreshedOrder(prev => prev.filter(id => id !== scheduledId));
    const { error } = await supabase
      .from('scheduled_activities')
      .delete()
      .eq('id', scheduledId);
    if (error) {
      console.error('deleteScheduled failed:', error.message);
      await refresh();
    }
  }

  async function unmarkDone(scheduledId: string) {
    setActivities(prev => computeStatuses(prev.map(a =>
      a.scheduledId === scheduledId ? { ...a, status: 'pending' } : a
    )));
    const { error } = await supabase
      .from('scheduled_activities')
      .update({ status: 'pending' })
      .eq('id', scheduledId);
    if (error) {
      console.error('unmarkDone failed:', error.message);
      await refresh();
    }
  }

  async function skipActivity(scheduledId: string) {
    setActivities(prev => computeStatuses(prev.map(a =>
      a.scheduledId === scheduledId ? { ...a, status: 'skipped' } : a
    )));
    const { error } = await supabase
      .from('scheduled_activities')
      .update({ status: 'skipped' })
      .eq('id', scheduledId);
    if (error) {
      console.error('skipActivity failed:', error.message);
      await refresh();
    }
  }

  async function unskipActivity(scheduledId: string) {
    setActivities(prev => computeStatuses(prev.map(a =>
      a.scheduledId === scheduledId ? { ...a, status: 'pending' } : a
    )));
    const { error } = await supabase
      .from('scheduled_activities')
      .update({ status: 'pending' })
      .eq('id', scheduledId);
    if (error) {
      console.error('unskipActivity failed:', error.message);
      await refresh();
    }
  }

  // Persists the new list position of every activity as its sort_order.
  // Reverts to server state if any write fails, so the UI never shows an
  // order that didn't actually save.
  async function persistSortOrder(ordered: Activity[]) {
    const results = await Promise.all(
      ordered.map((a, i) =>
        supabase.from('scheduled_activities').update({ sort_order: i }).eq('id', a.scheduledId)
      )
    );
    if (results.some(r => r.error)) {
      console.error('Failed to persist activity order');
      await refresh();
    }
  }

  function applyOrder(newArr: Activity[]) {
    const withSortOrder = newArr.map((a, i) => ({ ...a, sortOrder: i }));
    setActivities(computeStatuses(withSortOrder));
    persistSortOrder(withSortOrder);
  }

  // Manual reordering only makes sense within a group of activities that
  // share the same scheduled time (or share no time) — time is otherwise
  // the primary sort key, so a swap across a time boundary would just be
  // undone by the next sort. The UI also disables the arrows at this
  // boundary; this guard keeps the behavior correct regardless of caller.
  function moveUp(index: number) {
    if (index === 0) return;
    if (activities[index].time !== activities[index - 1].time) return;
    const arr = [...activities];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    applyOrder(arr);
  }

  function moveDown(index: number) {
    if (index === activities.length - 1) return;
    if (activities[index].time !== activities[index + 1].time) return;
    const arr = [...activities];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    applyOrder(arr);
  }

  function restoreOrder(originalOrder: string[]) {
    const arr = [...activities].sort((a, b) =>
      originalOrder.indexOf(a.scheduledId) - originalOrder.indexOf(b.scheduledId)
    );
    applyOrder(arr);
  }

  return (
    <ActivitiesContext.Provider value={{ activities, loading, otSensoryOrder, refreshedOrder, refresh, markDone, unmarkDone, skipActivity, unskipActivity, deleteScheduled, moveUp, moveDown, restoreOrder }}>
      {children}
    </ActivitiesContext.Provider>
  );
}

export function useActivities() {
  const ctx = useContext(ActivitiesContext);
  if (!ctx) throw new Error('useActivities must be used within ActivitiesProvider');
  return ctx;
}
