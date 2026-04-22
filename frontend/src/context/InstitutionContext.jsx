import { createContext, useContext, useState } from 'react';

export const InstitutionContext = createContext(null);

export function InstitutionProvider({ children }) {
  const [institution, setInstitution] = useState(null);
  return (
    <InstitutionContext.Provider value={{ institution, setInstitution }}>
      {children}
    </InstitutionContext.Provider>
  );
}

export const useInstitution = () => useContext(InstitutionContext);
