import { Platform } from 'react-native';

// Font families - using Google Fonts package for Sora
export const fontFamilies = {
  // Body font - Sora (Google Fonts package)
  sora: {
    light: 'Sora_300Light',
    regular: 'Sora_400Regular',
    medium: 'Sora_500Medium',
    semiBold: 'Sora_600SemiBold',
    bold: 'Sora_700Bold',
    extraBold: 'Sora_800ExtraBold',
  },
  
  // Header font - Clash Display (Local)
  clashDisplay: {
    extralight: 'ClashDisplay-Regular', // Fallback to regular
    light: 'ClashDisplay-Regular', // Fallback to regular
    regular: 'ClashDisplay-Regular',
    medium: 'ClashDisplay-Medium',
    semibold: 'ClashDisplay-Semibold',
    bold: 'ClashDisplay-Bold',
  },
};

// Font sizes
export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
};

// Line heights
export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};

// Font weights
export const fontWeights = {
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// Typography variants
export const typography = {
  // Display styles (using Clash Display)
  display: {
    large: {
      fontFamily: fontFamilies.clashDisplay.bold,
      fontSize: fontSizes['6xl'],
      lineHeight: fontSizes['6xl'] * lineHeights.tight,
      fontWeight: fontWeights.bold,
    },
    medium: {
      fontFamily: fontFamilies.clashDisplay.bold,
      fontSize: fontSizes['4xl'],
      lineHeight: fontSizes['4xl'] * lineHeights.tight,
      fontWeight: fontWeights.bold,
    },
    small: {
      fontFamily: fontFamilies.clashDisplay.semibold,
      fontSize: fontSizes['4xl'],
      lineHeight: fontSizes['4xl'] * lineHeights.tight,
      fontWeight: fontWeights.semibold,
    },
  },

  // Heading styles (using Clash Display)
  heading: {
    h1: {
      fontFamily: fontFamilies.clashDisplay.bold,
      fontSize: fontSizes['3xl'],
      lineHeight: fontSizes['3xl'] * lineHeights.tight,
      fontWeight: fontWeights.bold,
    },
    h2: {
      fontFamily: fontFamilies.clashDisplay.semibold,
      fontSize: fontSizes['2xl'],
      lineHeight: fontSizes['2xl'] * lineHeights.snug,
      fontWeight: fontWeights.semibold,
    },
    h3: {
      fontFamily: fontFamilies.clashDisplay.semibold,
      fontSize: fontSizes.xl,
      lineHeight: fontSizes.xl * lineHeights.snug,
      fontWeight: fontWeights.semibold,
    },
    h4: {
      fontFamily: fontFamilies.clashDisplay.medium,
      fontSize: fontSizes.lg,
      lineHeight: fontSizes.lg * lineHeights.normal,
      fontWeight: fontWeights.medium,
    },
    h5: {
      fontFamily: fontFamilies.clashDisplay.medium,
      fontSize: fontSizes.base,
      lineHeight: fontSizes.base * lineHeights.normal,
      fontWeight: fontWeights.medium,
    },
    h6: {
      fontFamily: fontFamilies.clashDisplay.medium,
      fontSize: fontSizes.sm,
      lineHeight: fontSizes.sm * lineHeights.normal,
      fontWeight: fontWeights.medium,
    },
  },

  // Body styles (using Sora)
  body: {
    large: {
      fontFamily: fontFamilies.sora.regular,
      fontSize: fontSizes.lg,
      lineHeight: fontSizes.lg * lineHeights.relaxed,
      fontWeight: fontWeights.normal,
    },
    medium: {
      fontFamily: fontFamilies.sora.regular,
      fontSize: fontSizes.base,
      lineHeight: fontSizes.base * lineHeights.normal,
      fontWeight: fontWeights.normal,
    },
    small: {
      fontFamily: fontFamilies.sora.regular,
      fontSize: fontSizes.sm,
      lineHeight: fontSizes.sm * lineHeights.normal,
      fontWeight: fontWeights.normal,
    },
  },

  // Label styles (using Sora)
  label: {
    large: {
      fontFamily: fontFamilies.sora.medium,
      fontSize: fontSizes.base,
      lineHeight: fontSizes.base * lineHeights.normal,
      fontWeight: fontWeights.medium,
    },
    medium: {
      fontFamily: fontFamilies.sora.medium,
      fontSize: fontSizes.sm,
      lineHeight: fontSizes.sm * lineHeights.normal,
      fontWeight: fontWeights.medium,
    },
    small: {
      fontFamily: fontFamilies.sora.medium,
      fontSize: fontSizes.xs,
      lineHeight: fontSizes.xs * lineHeights.normal,
      fontWeight: fontWeights.medium,
    },
  },

  // Caption styles (using Sora)
  caption: {
    large: {
      fontFamily: fontFamilies.sora.regular,
      fontSize: fontSizes.sm,
      lineHeight: fontSizes.sm * lineHeights.normal,
      fontWeight: fontWeights.normal,
    },
    medium: {
      fontFamily: fontFamilies.sora.regular,
      fontSize: fontSizes.xs,
      lineHeight: fontSizes.xs * lineHeights.normal,
      fontWeight: fontWeights.normal,
    },
  },

  // Button styles (using Sora)
  button: {
    large: {
      fontFamily: fontFamilies.sora.semiBold,
      fontSize: fontSizes.base,
      lineHeight: fontSizes.base * lineHeights.none,
      fontWeight: fontWeights.semibold,
    },
    medium: {
      fontFamily: fontFamilies.sora.semiBold,
      fontSize: fontSizes.sm,
      lineHeight: fontSizes.sm * lineHeights.none,
      fontWeight: fontWeights.semibold,
    },
    small: {
      fontFamily: fontFamilies.sora.medium,
      fontSize: fontSizes.xs,
      lineHeight: fontSizes.xs * lineHeights.none,
      fontWeight: fontWeights.medium,
    },
  },
};

// Platform-specific font adjustments
export const getAdjustedFontSize = (size: number) => {
  if (Platform.OS === 'ios') {
    return size;
  }
  // Android typically needs slightly smaller font sizes
  return size * 0.95;
};

export default {
  fontFamilies,
  fontSizes,
  lineHeights,
  fontWeights,
  typography,
  getAdjustedFontSize,
}; 