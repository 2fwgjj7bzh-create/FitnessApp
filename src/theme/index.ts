export const colors = {
  // ─── Backgrounds ─────────────────────────────────────────────────────────────
  background: '#FFFFFF',
  surface: '#F7F7F7',
  card: '#FFFFFF',
  cardBorder: '#EBEBEB',

  // ─── Brand ───────────────────────────────────────────────────────────────────
  primary: '#111111',
  primaryLight: '#444444',
  primaryDark: '#000000',

  // ─── Semantic ────────────────────────────────────────────────────────────────
  secondary: '#6B6B6B',
  success: '#00875A',
  warning: '#E65C00',
  error: '#C8102E',
  info: '#1565C0',

  // ─── Text ────────────────────────────────────────────────────────────────────
  text: '#111111',
  textSecondary: '#6B6B6B',
  textMuted: '#B5B5B5',

  // ─── UI chrome ───────────────────────────────────────────────────────────────
  border: '#E8E8E8',
  tabBar: '#FFFFFF',
  inputBg: '#F5F5F5',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  round: 999,
};

export const typography = {
  h1: { fontSize: 40, fontWeight: '900' as const, lineHeight: 44, letterSpacing: -1.5 },
  h2: { fontSize: 26, fontWeight: '800' as const, lineHeight: 30, letterSpacing: -0.8 },
  h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '700' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '700' as const, lineHeight: 16, letterSpacing: 0.8 },
  tiny: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  primary: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  success: {
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
};
