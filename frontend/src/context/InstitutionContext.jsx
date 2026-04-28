import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { institutionsService } from '../services/institutionsService';

export const InstitutionContext = createContext(null);

export function InstitutionProvider({ children }) {
  const { user } = useAuth();
  const [institution, setInstitution] = useState(null);

  useEffect(() => {
    if (!user) { setInstitution(null); return; }
    institutionsService.me()
      .then((res) => setInstitution(res.data))
      .catch(() => setInstitution(null));
  }, [user]);

  return (
    <InstitutionContext.Provider value={{ institution, setInstitution }}>
      {children}
    </InstitutionContext.Provider>
  );
}

export const useInstitution = () => useContext(InstitutionContext);
