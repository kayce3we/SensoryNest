export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          child_name: string | null;
          child_age: number | null;
          child_notes: string | null;
          ot_name: string | null;
          ot_email: string | null;
          ot_next_session: string | null;
          expo_push_token: string | null;
          reminders_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          child_name?: string | null;
          child_age?: number | null;
          child_notes?: string | null;
          ot_name?: string | null;
          ot_email?: string | null;
          ot_next_session?: string | null;
          expo_push_token?: string | null;
          reminders_enabled?: boolean;
        };
        Update: {
          child_name?: string | null;
          child_age?: number | null;
          child_notes?: string | null;
          ot_name?: string | null;
          ot_email?: string | null;
          ot_next_session?: string | null;
          expo_push_token?: string | null;
          reminders_enabled?: boolean;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          sensory_system: string;
          source: string;
          duration: number;
          is_library: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          sensory_system: string;
          source?: string;
          duration?: number;
          is_library?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          sensory_system?: string;
          source?: string;
          duration?: number;
          is_library?: boolean;
        };
        Relationships: [];
      };
      scheduled_activities: {
        Row: {
          id: string;
          user_id: string;
          activity_id: string;
          scheduled_date: string;
          scheduled_time: string | null;
          status: string;
          sort_order: number;
          ot_sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_id: string;
          scheduled_date: string;
          scheduled_time?: string | null;
          status?: string;
          sort_order?: number;
          ot_sort_order?: number;
        };
        Update: {
          scheduled_time?: string | null;
          status?: string;
          sort_order?: number;
          ot_sort_order?: number;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          progress: number;
          status: string;
          target_date: string | null;
          ot_set: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          progress?: number;
          status?: string;
          target_date?: string | null;
          ot_set?: boolean;
        };
        Update: {
          title?: string;
          description?: string | null;
          progress?: number;
          status?: string;
          target_date?: string | null;
          ot_set?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      goal_notes: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          user_id: string;
          note: string;
        };
        Update: {
          note?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
