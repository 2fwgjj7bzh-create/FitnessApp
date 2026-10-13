// Charte Anajar : noir #0A0A0A, blanc, rouge #C8102E (Bebas Neue / DM Sans)
export const colors = {
  // ─── Backgrounds ─────────────────────────────────────────────────────────────
  background: '#0A0A0A',
  surface: '#111111',
  card: '#161616',
  cardBorder: '#2A2A2A',

  // ─── Brand (rouge) ───────────────────────────────────────────────────────────
  primary: '#C8102E',        // rouge principal
  primaryLight: '#E8475F',   // rouge clair (texte rouge sur fond noir, focus)
  primaryDark: '#8E0B20',    // rouge foncé (pressed)
  primaryMuted: '#C8102E26', // rouge transparent (backgrounds subtils)
  onPrimary: '#FFFFFF',      // texte / icônes posés sur le rouge

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

// Polices de la charte (chargées dans App.tsx). Les polices custom portent leur graisse :
// on ne remet pas de fontWeight par-dessus (sinon iOS/Android retombent sur la police système).
export const fonts = {
  display: 'BebasNeue_400Regular',
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
};

export const typography = {
  h1: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: 0.5 },
  h2: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: 0.5 },
  h3: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8 },
  tiny: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
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
    shadowColor: '#C8102E',
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
  red: ['#C8102E', '#8E0B20'],
  redSubtle: ['#C8102E26', '#C8102E00'],
  dark: ['#1A1A1A', '#0A0A0A'],
  card: ['#1E1E1E', '#141414'],
};
