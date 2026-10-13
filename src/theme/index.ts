// Palette : noir profond + accents or/doré — premium masculin
export const colors = {
  // ─── Backgrounds ─────────────────────────────────────────────────────────────
  background: '#0A0A0A',
  surface: '#111111',
  card: '#161616',
  cardBorder: '#2A2A2A',

  // ─── Brand (or/doré) ─────────────────────────────────────────────────────────
  primary: '#C9A84C',        // or principal
  primaryLight: '#E4C97A',   // or clair (hover, focus)
  primaryDark: '#9A7A2E',    // or foncé (pressed)
  primaryMuted: '#C9A84C22', // or transparent (backgrounds subtils)

  // ─── Semantic ────────────────────────────────────────────────────────────────
  secondary: '#888888',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // ─── Text ────────────────────────────────────────────────────────────────────
  text: '#F2F2F2',
  textSecondary: '#A0A0A0',
  textMuted: '#555555',

  // ─── UI chrome ───────────────────────────────────────────────────────────────
  border: '#2A2A2A',
  borderLight: '#1E1E1E',
  tabBar: '#0E0E0E',
  inputBg: '#1A1A1A',

  // ─── Locked/disabled ─────────────────────────────────────────────────────────
  locked: '#333333',
  lockedText: '#666666',
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
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  primary: {
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  success: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
};

// Dégradés réutilisables (pour LinearGradient si besoin)
export const gradients = {
  gold: ['#C9A84C', '#9A7A2E'],
  goldSubtle: ['#C9A84C22', '#C9A84C00'],
  dark: ['#1A1A1A', '#0A0A0A'],
  card: ['#1E1E1E', '#141414'],
};
