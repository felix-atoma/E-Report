import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    // Only a real auth rejection ends the session. A network error or a 5xx (Render waking up,
    // flaky connection) is retried instead of wiping the tokens and throwing the user out.
    const loadMe = async (attempt = 0) => {
      try {
        const res = await authService.me();
        setUser(res.data);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403 || attempt >= 3) {
          if (status === 401 || status === 403) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        return loadMe(attempt + 1);
      }
    };
    loadMe().finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authService.login(email, password);
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const loginWithTokens = useCallback((data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, loginWithTokens, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
