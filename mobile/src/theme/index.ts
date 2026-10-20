import { StyleSheet } from 'react-native';

// Black, Blue Black, and White color theme
export const colors = {
  // Primary colors
  black: '#000000',
  white: '#FFFFFF',
  blueBlack: '#1A1A2E',

  // Primary accent - blue black for interactive elements
  primary: '#1A1A2E',
  primaryLight: '#2D2D44',
  primaryDark: '#0D0D17',

  // Grays - monochrome scale
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Semantic colors
  background: '#FFFFFF',
  foreground: '#000000',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  border: '#E0E0E0',
  muted: '#F5F5F5',
  mutedForeground: '#757575',

  // Status colors
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
  info: '#1976D2',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
};

export const fontWeight = {
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Common styles
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Typography
  heading1: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.light,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  heading2: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.light,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  heading3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.normal,
    color: colors.foreground,
  },
  body: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
    color: colors.foreground,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    color: colors.mutedForeground,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    color: colors.mutedForeground,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Buttons
  buttonPrimary: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutlineText: {
    color: colors.black,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Cards
  card: {
    backgroundColor: colors.card,
    borderWidth: 0,
  },
  // Input
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.foreground,
    backgroundColor: colors.white,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  // Badge
  badge: {
    backgroundColor: colors.black,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export const formatPrice = (price: number | string, currency = 'GHC'): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `${numPrice.toLocaleString()} ${currency}`;
};

export const FREE_DELIVERY_THRESHOLD = 50000;
export const DELIVERY_FEE = 1000;
