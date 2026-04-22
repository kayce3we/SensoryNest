import { supabase } from './supabase';
import type { Database } from './database.types';

type ScheduledActivity = Database['public']['Tables']['scheduled_activities']['Row'];
type Activity = Database['public']['Tables']['activities']['Row'];

export type ScheduledActivityWithDetails = ScheduledActivity & { activity: Activity };

export async function getTodayActivities(userId: string): Promise<ScheduledActivityWithDetails[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('scheduled_activities')
    .select('*, activity:activities(*)')
    .eq('user_id', userId)
    .eq('scheduled_date', today)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ScheduledActivityWithDetails[];
}

export async function markActivityDone(scheduledId: string): Promise<void> {
  const { error } = await supabase
    .from('scheduled_activities')
    .update({ status: 'done' })
    .eq('id', scheduledId);
  if (error) throw error;
}

export async function reorderActivities(updates: { id: string; sort_order: number }[]): Promise<void> {
  const promises = updates.map(({ id, sort_order }) =>
    supabase.from('scheduled_activities').update({ sort_order }).eq('id', id)
  );
  await Promise.all(promises);
}

export async function getLibraryActivities(userId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .or(`is_library.eq.true,user_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createActivity(
  activity: Database['public']['Tables']['activities']['Insert']
): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function scheduleActivity(
  userId: string,
  activityId: string,
  scheduledDate: string,
  scheduledTime: string | null,
  sortOrder: number
): Promise<void> {
  const { error } = await supabase.from('scheduled_activities').insert({
    user_id: userId,
    activity_id: activityId,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    status: 'pending',
    sort_order: sortOrder,
    ot_sort_order: sortOrder,
  });
  if (error) throw error;
}
