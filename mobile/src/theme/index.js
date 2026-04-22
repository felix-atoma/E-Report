// Design tokens — mirrors src/styles/settings/ from the web app.
// Dynamic school branding overrides these at runtime via ThemeContext.

export const colors = {
  primary: '#1e40af',
  secondary: '#64748b',
  accent: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  text: '#1f2937',
  textMuted: '#6b7280',
  textInverse: '#ffffff',

  bg: '#ffffff',
  bgSubtle: '#f9fafb',
  bgMuted: '#f3f4f6',

  border: '#e5e7eb',
  borderStrong: '#d1d5db',

  statusPaid: '#10b981',
  statusPartial: '#f59e0b',
  statusUnpaid: '#ef4444',
  statusExempt: '#6b7280',
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
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  '2xl': 32,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
};

// Merged theme object for convenience
const theme = { colors, spacing, fontSize, fontWeight, radius, shadow };
export default theme;
