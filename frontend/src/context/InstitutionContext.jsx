import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { institutionsService } from '../services/institutionsService';

export const InstitutionContext = createContext(null);

export function InstitutionProvider({ children }) {
  const { user } = useAuth();
  const [institution, setInstitution] = useState(null);

  function fetchInstitution() {
    institutionsService.me()
      .then((res) => setInstitution(res.data))
      .catch(() => setInstitution(null));
  }

  useEffect(() => {
    if (!user || user.role === 'SUPERADMIN') { setInstitution(null); return; }
    fetchInstitution();
  }, [user]);

  function refreshInstitution() {
    if (user && user.role !== 'SUPERADMIN') fetchInstitution();
  }

  return (
    <InstitutionContext.Provider value={{ institution, setInstitution, refreshInstitution }}>
      {children}
    </InstitutionContext.Provider>
  );
}

export const useInstitution = () => useContext(InstitutionContext);
