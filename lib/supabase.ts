import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SecureStore has a 2048 byte limit — chunk large values (Supabase sessions exceed this)
const CHUNK_SIZE = 1900;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const numChunks = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!numChunks) return SecureStore.getItemAsync(key);
    let value = '';
    for (let i = 0; i < parseInt(numChunks); i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
      value += chunk ?? '';
    }
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const numChunks = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}_chunks`, String(numChunks));
    for (let i = 0; i < numChunks; i++) {
      await SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
  },
  removeItem: async (key: string): Promise<void> => {
    const numChunks = await SecureStore.getItemAsync(`${key}_chunks`);
    if (numChunks) {
      for (let i = 0; i < parseInt(numChunks); i++) {
        await SecureStore.deleteItemAsync(`${key}_${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
