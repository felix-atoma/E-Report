import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store is native-only; fall back to localStorage on web
const webStore = {
  getItemAsync: async (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItemAsync: async (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  },
  deleteItemAsync: async (key) => {
    try { localStorage.removeItem(key); } catch {}
  },
};

export default Platform.OS === 'web' ? webStore : SecureStore;
