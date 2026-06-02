// Design tokens — Dynamic school branding overrides at runtime via ThemeContext.

export const colors = {
  primary: '#1e40af',
  primaryLight: '#3b82f6',
  primaryDark: '#1e3a8a',
  secondary: '#64748b',
  accent: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  text: '#0f172a',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  textInverse: '#ffffff',

  bg: '#ffffff',
  bgSubtle: '#f8fafc',
  bgMuted: '#f1f5f9',

  border: '#e2e8f0',
  borderStrong: '#cbd5e1',

  statusPaid: '#10b981',
  statusPartial: '#f59e0b',
  statusUnpaid: '#ef4444',
  statusExempt: '#64748b',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadow = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
};

const theme = { colors, spacing, fontSize, fontWeight, radius, shadow };
export default theme;
