export const colors = {
  // ─── Backgrounds ─────────────────────────────────────────────────────────────
  background: '#0B0B12',
  surface: '#13131F',
  card: '#1A1A28',
  cardBorder: '#252540',

  // ─── Brand ───────────────────────────────────────────────────────────────────
  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#D9531A',

  // ─── Semantic ────────────────────────────────────────────────────────────────
  secondary: '#7C6FF7',       // violet accent (ex-primary)
  success: '#00C9A7',
  warning: '#FFB800',
  error: '#FF4040',
  info: '#3D9CF5',

  // ─── Text ────────────────────────────────────────────────────────────────────
  text: '#F2F2FA',
  textSecondary: '#8A8AA8',
  textMuted: '#4A4A65',

  // ─── UI chrome ───────────────────────────────────────────────────────────────
  border: '#252540',
  tabBar: '#0F0F1A',
  inputBg: '#202032',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

// lineHeight ajouté sur toutes les variantes (règle ui-ux-pro-max §6)
export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.8 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  tiny: { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primary: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  success: {
    shadowColor: '#00C9A7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
};
