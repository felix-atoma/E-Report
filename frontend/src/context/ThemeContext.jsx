import { createContext, useContext, useEffect, useState } from 'react';
import { useInstitution } from './InstitutionContext';

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { institution } = useInstitution();

  const [darkMode, setDarkModeState] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  function toggleDarkMode() {
    setDarkModeState((prev) => {
      const next = !prev;
      localStorage.setItem('darkMode', String(next));
      return next;
    });
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!institution?.brandingSettings) return;
    const root = document.documentElement;
    const b = institution.brandingSettings;
    // Les couleurs de l'école (primaryColor, secondaryColor…) ne s'appliquent qu'aux bulletins PDF :
    // le tableau de bord garde les couleurs NovaBulletin, comme la page d'accueil.
    if (b.fontFamilyHeading) root.style.setProperty('--font-family-heading', b.fontFamilyHeading);
    if (b.fontFamilyBody)    root.style.setProperty('--font-family-body',    b.fontFamilyBody);
  }, [institution]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
