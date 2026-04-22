import { supabase } from './supabase';
import type { Database } from './database.types';

type Goal = Database['public']['Tables']['goals']['Row'];
type GoalNote = Database['public']['Tables']['goal_notes']['Row'];

export async function getGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createGoal(
  goal: Database['public']['Tables']['goals']['Insert']
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert(goal)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGoalProgress(goalId: string, progress: number): Promise<void> {
  const status = progress >= 100 ? 'achieved' : 'active';
  const { error } = await supabase
    .from('goals')
    .update({ progress, status, updated_at: new Date().toISOString() })
    .eq('id', goalId);
  if (error) throw error;
}

export async function getGoalNotes(goalId: string): Promise<GoalNote[]> {
  const { data, error } = await supabase
    .from('goal_notes')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addGoalNote(goalId: string, userId: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('goal_notes')
    .insert({ goal_id: goalId, user_id: userId, note });
  if (error) throw error;
}
