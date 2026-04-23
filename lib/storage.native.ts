// Native storage adapter using expo-secure-store with chunking (2048 byte limit)
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1900;

export const storageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const numChunks = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!numChunks) return SecureStore.getItemAsync(key);
    let value = '';
    for (let i = 0; i < parseInt(numChunks); i++) {
      value += (await SecureStore.getItemAsync(`${key}_${i}`)) ?? '';
    }
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= CHUNK_SIZE) { await SecureStore.setItemAsync(key, value); return; }
    const numChunks = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}_chunks`, String(numChunks));
    for (let i = 0; i < numChunks; i++) {
      await SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
  },
  removeItem: async (key: string): Promise<void> => {
    const numChunks = await SecureStore.getItemAsync(`${key}_chunks`);
    if (numChunks) {
      for (let i = 0; i < parseInt(numChunks); i++) await SecureStore.deleteItemAsync(`${key}_${i}`);
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};
