import { createContext, useContext, useState } from 'react';
import i18n from '../locales/i18n';

const defaultLang = (() => {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null;
  return ['fr', 'en'].includes(stored) ? stored : 'fr';
})();

export const LanguageContext = createContext({ language: defaultLang, setLanguage: () => {} });

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
