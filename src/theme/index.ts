export const colors = {
  background: '#0F0F13',
  surface: '#1A1A24',
  card: '#1E1E2E',
  cardBorder: '#2A2A3A',
  primary: '#7C6FF7',
  primaryLight: '#A89BFF',
  primaryDark: '#5A54C7',
  secondary: '#FF6B6B',
  success: '#4ECDC4',
  warning: '#FFD93D',
  error: '#FF4C4C',
  info: '#64B5F6',
  text: '#F0F0F8',
  textSecondary: '#9090AA',
  textMuted: '#555566',
  border: '#2A2A3A',
  tabBar: '#13131A',
  inputBg: '#252535',
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

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '400' as const },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
};
