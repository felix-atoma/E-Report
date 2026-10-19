import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

// Compte gardé sur l'appareil : sans internet, l'application s'ouvre quand même (pas de retour
// à la connexion). Le serveur reste juge : un 401/403 au retour du réseau ferme la session.
const CACHED_USER = 'cachedUser';
const readCachedUser = () => {
  if (!localStorage.getItem('accessToken')) return null;
  try { return JSON.parse(localStorage.getItem(CACHED_USER) || 'null'); } catch { return null; }
};
const cacheUser = (u) => {
  try { if (u) localStorage.setItem(CACHED_USER, JSON.stringify(u)); else localStorage.removeItem(CACHED_USER); } catch { /* ignore */ }
};
const clearSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  cacheUser(null);
};

export function AuthProvider({ children }) {
  const [cached] = useState(readCachedUser);
  const [user, setUserState] = useState(cached);
  // Compte connu sur l'appareil : pas d'écran de chargement, la vérification se fait en arrière-plan
  const [loading, setLoading] = useState(!cached);

  const setUser = useCallback((u) => {
    setUserState((prev) => {
      const next = typeof u === 'function' ? u(prev) : u;
      cacheUser(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    // Only a real auth rejection ends the session. A network error or a 5xx (Render waking up,
    // flaky connection, no internet) is retried instead of wiping the tokens and throwing the user out.
    const loadMe = async (attempt = 0) => {
      try {
        const res = await authService.me();
        setUser(res.data);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          clearSession();
          setUserState(null);
          return;
        }
        // Hors ligne : on garde le compte de l'appareil et on revérifie au retour d'internet
        if (!navigator.onLine) return;
        if (attempt >= 3) return;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        return loadMe(attempt + 1);
      }
    };
    loadMe().finally(() => setLoading(false));
    const onOnline = () => { if (localStorage.getItem('accessToken')) loadMe(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [setUser]);

  const login = useCallback(async (email, password) => {
    const res = await authService.login(email, password);
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
    return res.data.user;
  }, [setUser]);

  const loginWithTokens = useCallback((data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  }, [setUser]);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    clearSession();
    // Téléphone partagé : les pages gardées pour le hors-ligne ne restent pas pour le suivant
    try { await window.caches?.delete('api-cache'); } catch { /* ignore */ }
    setUserState(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => prev ? { ...prev, ...patch } : prev);
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ user, login, loginWithTokens, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
