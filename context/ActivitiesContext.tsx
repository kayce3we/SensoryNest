import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export interface Activity {
  id: string;
  name: string;
  desc: string;
  system: string;
  source: 'ot' | 'library' | 'my';
  duration: number;
  status: 'done' | 'next' | 'pending';
  time: string | null;
  scheduledId: string;
  sortOrder: number;
}

interface ActivitiesContextValue {
  activities: Activity[];
  loading: boolean;
  refresh: () => Promise<void>;
  markDone: (scheduledId: string) => Promise<void>;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  restoreOrder: (originalOrder: string[]) => void;
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

function computeStatuses(activities: Activity[]): Activity[] {
  let nextAssigned = false;
  return activities.map(a => {
    if (a.status === 'done') return a;
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

  async function refresh() {
    if (!userId) { setActivities([]); setLoading(false); return; }
    setLoading(true);
    try {
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
        source: row.activity.source as 'ot' | 'library' | 'my',
        duration: row.activity.duration,
        status: row.status as 'done' | 'next' | 'pending',
        time: row.scheduled_time,
        sortOrder: row.sort_order,
      }));

      setActivities(computeStatuses(mapped));
    } catch (e) {
      console.error('Failed to load activities', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [userId]);

  async function markDone(scheduledId: string) {
    await supabase.from('scheduled_activities').update({ status: 'done' }).eq('id', scheduledId);
    setActivities(prev => computeStatuses(prev.map(a =>
      a.scheduledId === scheduledId ? { ...a, status: 'done' } : a
    )));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setActivities(prev => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  }

  function moveDown(index: number) {
    setActivities(prev => {
      if (index === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  }

  function restoreOrder(originalOrder: string[]) {
    setActivities(prev => [...prev].sort((a, b) =>
      originalOrder.indexOf(a.scheduledId) - originalOrder.indexOf(b.scheduledId)
    ));
  }

  return (
    <ActivitiesContext.Provider value={{ activities, loading, refresh, markDone, moveUp, moveDown, restoreOrder }}>
      {children}
    </ActivitiesContext.Provider>
  );
}

export function useActivities() {
  const ctx = useContext(ActivitiesContext);
  if (!ctx) throw new Error('useActivities must be used within ActivitiesProvider');
  return ctx;
}
