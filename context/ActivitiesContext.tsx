import React, { createContext, useContext, useState } from 'react';
import { initialActivities, type Activity } from '@/constants/data';

interface ActivitiesContextValue {
  activities: Activity[];
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
  markDone: (id: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  restoreOrder: (originalOrder: number[]) => void;
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

export function ActivitiesProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);

  function markDone(id: number) {
    setActivities(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, status: 'done' as const } : a);
      return updated.map((a, i, arr) => {
        if (a.status === 'pending' && !arr.slice(0, i).some(x => x.status !== 'done')) {
          return { ...a, status: 'next' as const };
        }
        return a;
      });
    });
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

  function restoreOrder(originalOrder: number[]) {
    setActivities(prev => [...prev].sort((a, b) => originalOrder.indexOf(a.id) - originalOrder.indexOf(b.id)));
  }

  return (
    <ActivitiesContext.Provider value={{ activities, setActivities, markDone, moveUp, moveDown, restoreOrder }}>
      {children}
    </ActivitiesContext.Provider>
  );
}

export function useActivities() {
  const ctx = useContext(ActivitiesContext);
  if (!ctx) throw new Error('useActivities must be used within ActivitiesProvider');
  return ctx;
}
