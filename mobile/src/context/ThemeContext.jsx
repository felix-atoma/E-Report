import { createContext, useContext, useState } from 'react';
import { colors as defaultColors } from '../theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [colors, setColors] = useState(defaultColors);

  // Called when institution loads — applies school branding
  function applyBranding(brandingSettings) {
    if (!brandingSettings) return;
    setColors((prev) => ({
      ...prev,
      ...(brandingSettings.primaryColor && { primary: brandingSettings.primaryColor }),
      ...(brandingSettings.secondaryColor && { secondary: brandingSettings.secondaryColor }),
      ...(brandingSettings.accentColor && { accent: brandingSettings.accentColor }),
    }));
  }

  return (
    <ThemeContext.Provider value={{ colors, applyBranding }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
