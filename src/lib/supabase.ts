import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import type { Database } from './database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY manquants : copie .env.example vers .env.',
  );
}

/**
 * SecureStore plafonne chaque valeur à 2 Ko alors qu'une session Supabase est
 * plus longue : on la découpe en tranches `clé.0`, `clé.1`… et on garde le
 * nombre de tranches sous la clé d'origine.
 */
const CHUNK_SIZE = 1800;

async function clearChunks(key: string) {
  const count = Number((await SecureStore.getItemAsync(key)) ?? 0);
  for (let i = 0; i < count; i += 1) await SecureStore.deleteItemAsync(`${key}.${i}`);
  await SecureStore.deleteItemAsync(key);
}

const secureStorage: SupportedStorage = {
  async getItem(key) {
    const count = Number((await SecureStore.getItemAsync(key)) ?? 0);
    if (!count) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null; // tranche perdue : session inutilisable
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key, value) {
    await clearChunks(key);
    const count = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(key, String(count));
  },
  removeItem: clearChunks,
};

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // L'app n'existe que sur mobile ; le web ne sert qu'aux outils de développement.
    storage: Platform.OS === 'web' ? undefined : secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
