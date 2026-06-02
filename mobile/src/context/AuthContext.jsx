import { createContext, useContext, useEffect, useReducer } from 'react';
import SecureStore from '../utils/secureStorage';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const initialState = { user: null, loading: true, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from stored tokens on app start
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (!token) return dispatch({ type: 'LOGOUT' });

        const res = await authService.me();
        dispatch({ type: 'SET_USER', payload: res.data.data });
      } catch {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        dispatch({ type: 'LOGOUT' });
      }
    })();
  }, []);

  async function login(email, password) {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await authService.login(email, password);
      const { user, accessToken, refreshToken } = res.data.data;
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      dispatch({ type: 'SET_USER', payload: user });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Identifiants invalides';
      dispatch({ type: 'SET_ERROR', payload: msg });
      return { success: false, error: msg };
    }
  }

  async function logout() {
    try {
      await authService.logout();
    } catch {
      // ignore — clear local state regardless
    } finally {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      dispatch({ type: 'LOGOUT' });
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
