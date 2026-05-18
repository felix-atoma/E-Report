import { createContext, useContext, useEffect, useState } from 'react';
import { useInstitution } from './InstitutionContext';

function hexToHsl(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  let r = parseInt(m[1], 16) / 255;
  let g = parseInt(m[2], 16) / 255;
  let b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function setSidebarVars(root, primaryColor) {
  const hsl = hexToHsl(primaryColor);
  if (!hsl) return;
  const { h } = hsl;
  root.style.setProperty('--sidebar-bg',        `hsl(${h},30%,9%)`);
  root.style.setProperty('--sidebar-bg-subtle',  `hsl(${h},25%,13%)`);
  root.style.setProperty('--sidebar-bg-muted',   `hsl(${h},20%,18%)`);
}

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
    if (b.primaryColor) {
      root.style.setProperty('--color-primary', b.primaryColor);
      setSidebarVars(root, b.primaryColor);
    }
    if (b.secondaryColor)    root.style.setProperty('--color-secondary',    b.secondaryColor);
    if (b.accentColor)       root.style.setProperty('--color-accent',       b.accentColor);
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
