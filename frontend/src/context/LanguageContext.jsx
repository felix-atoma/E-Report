import { createContext, useContext, useState } from 'react';
import i18n from '../locales/i18n';

export const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const stored = localStorage.getItem('lang');
  const initial = ['fr', 'en'].includes(stored) ? stored : 'fr';
  const [language, setLanguageState] = useState(initial);

  function setLanguage(lng) {
    setLanguageState(lng);
    i18n.changeLanguage(lng);
    localStorage.setItem('lang', lng);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
