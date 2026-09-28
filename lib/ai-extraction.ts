import { supabase } from './supabase';

export interface SuggestContext {
  childName?: string;
  childAge?: number;
  childNotes?: string;
  otNotes?: string;
  sensoryOrder?: string[];
}

export interface ExtractedActivity {
  name: string;
  description: string;
  sensory_system: string;
  duration: number;
  suggested_time?: string;
}

export interface ExtractionResult {
  activities: ExtractedActivity[];
  otSummary: string;
  sensoryOrder: string[];
}

async function invokeClaude<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('claude', { body });
  if (error) throw new Error(data?.error ?? error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function suggestActivities(
  prompt: string,
  context: SuggestContext,
): Promise<ExtractedActivity[]> {
  const { activities } = await invokeClaude<{ activities: ExtractedActivity[] }>({
    action: 'suggest',
    prompt,
    context,
  });
  return activities;
}

export async function extractActivitiesFromPDF(pdfBase64: string): Promise<ExtractionResult> {
  return invokeClaude<ExtractionResult>({ action: 'extract', pdfBase64 });
}
