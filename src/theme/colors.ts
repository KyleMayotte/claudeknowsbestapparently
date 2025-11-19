// Color palette for MuscleUp app
// Professional, modern fitness app colors

export const lightColors = {
  // Primary colors - Blue/Teal for fitness/health
  primary: '#007AFF',
  primaryDark: '#0051D5',
  primaryLight: '#4DA3FF',

  // Secondary colors - Accent
  secondary: '#00C853',
  secondaryDark: '#00A844',
  secondaryLight: '#5EFC82',

  // Status colors
  success: '#00C853',
  warning: '#FFB300',
  error: '#FF3B30',
  info: '#007AFF',

  // Neutral colors
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceDark: '#F1F3F5',

  // Text colors
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  textInverse: '#FFFFFF',

  // Border colors
  border: '#E5E5EA',
  borderDark: '#D1D1D6',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Gradient colors (for LinearGradient)
  gradientPrimary: ['#007AFF15', '#4DA3FF08'] as readonly [string, string],
  gradientSecondary: ['#00C85315', '#5EFC8208'] as readonly [string, string],

  // Transparent
  transparent: 'transparent',
} as const;

export const darkColors = {
  // Primary colors - Slightly brighter for dark mode
  primary: '#0A84FF',
  primaryDark: '#0066D6',
  primaryLight: '#5EB8FF',

  // Secondary colors - Accent
  secondary: '#30D158',
  secondaryDark: '#28A745',
  secondaryLight: '#5EFC82',

  // Status colors
  success: '#30D158',
  warning: '#FFD60A',
  error: '#FF453A',
  info: '#0A84FF',

  // Neutral colors - Dark backgrounds
  background: '#000000',
  surface: '#1C1C1E',
  surfaceDark: '#2C2C2E',

  // Text colors - Inverted for dark mode
  textPrimary: '#FFFFFF',
  textSecondary: '#98989D',
  textTertiary: '#48484A',
  textInverse: '#1C1C1E',

  // Border colors
  border: '#38383A',
  borderDark: '#48484A',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  // Gradient colors (for LinearGradient)
  gradientPrimary: ['#0A84FF15', '#5EB8FF08'] as readonly [string, string],
  gradientSecondary: ['#30D15815', '#5EFC8208'] as readonly [string, string],

  // Transparent
  transparent: 'transparent',
} as const;

// Default export for backward compatibility
export const colors = lightColors;

export type ColorScheme = typeof lightColors;
export type ColorKey = keyof ColorScheme;
