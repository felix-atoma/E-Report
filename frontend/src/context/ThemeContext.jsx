import { createContext, useContext, useEffect } from 'react';
import { useInstitution } from './InstitutionContext';

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { institution } = useInstitution();

  useEffect(() => {
    if (!institution?.brandingSettings) return;
    const root = document.documentElement;
    const b = institution.brandingSettings;
    if (b.primaryColor) root.style.setProperty('--color-primary', b.primaryColor);
    if (b.secondaryColor) root.style.setProperty('--color-secondary', b.secondaryColor);
    if (b.accentColor) root.style.setProperty('--color-accent', b.accentColor);
    if (b.fontFamilyHeading) root.style.setProperty('--font-family-heading', b.fontFamilyHeading);
    if (b.fontFamilyBody) root.style.setProperty('--font-family-body', b.fontFamilyBody);
  }, [institution]);

  return <ThemeContext.Provider value={institution}>{children}</ThemeContext.Provider>;
}
