const colors = {
  // Primary color
  primary: {
    50: '#FFFBEB',
    100: '#FFF8D6',
    200: '#FFF1AD',
    300: '#FFEB85',
    400: '#FFE85C',
    500: '#FFE66C', // Main primary color
    600: '#CCB856',
    700: '#998A41',
    800: '#665C2B',
    900: '#332E16',
  },

  // Gray scale
  gray: {
    25: '#FCFCFD',
    50: '#F9FAFB',
    100: '#F2F4F7',
    200: '#EAECF0',
    300: '#D0D5DD',
    400: '#98A2B3',
    500: '#667085',
    600: '#475467',
    700: '#344054',
    800: '#1D2939',
    900: '#101828',
  },

  // Semantic colors
  success: {
    50: '#ECFDF3',
    500: '#10B981',
    600: '#059669',
  },
  
  error: {
    50: '#FEF2F2',
    500: '#EF4444',
    600: '#DC2626',
  },
  
  warning: {
    50: '#FFFBEB',
    500: '#F59E0B',
    600: '#D97706',
  },
  
  info: {
    50: '#EFF6FF',
    500: '#3B82F6',
    600: '#2563EB',
  },

  // Pure colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const lightTheme = {
  primary: colors.primary[500],
  primaryLight: colors.primary[100],
  primaryDark: colors.primary[700],
  
  background: '#FAFAFB',
  surface: colors.gray[50],
  surfaceVariant: colors.gray[100],
  
  text: colors.gray[900],
  textSecondary: colors.gray[600],
  textTertiary: colors.gray[400],
  
  border: colors.gray[200],
  borderLight: colors.gray[100],
  
  success: colors.success[500],
  error: colors.error[500],
  warning: colors.warning[500],
  info: colors.info[500],
  
  white: colors.white,
  black: colors.black,
  
  tabIconDefault: colors.gray[400],
  tabIconSelected: colors.primary[500],
  tint: colors.primary[500],
};

export const darkTheme = {
  primary: colors.primary[400],
  primaryLight: colors.primary[200],
  primaryDark: colors.primary[600],
  
  background: '#000000',
  surface: colors.gray[800],
  surfaceVariant: colors.gray[700],
  
  text: colors.gray[50],
  textSecondary: colors.gray[300],
  textTertiary: colors.gray[500],
  
  border: colors.gray[700],
  borderLight: colors.gray[600],
  
  success: colors.success[500],
  error: colors.error[500],
  warning: colors.warning[500],
  info: colors.info[500],
  
  white: colors.white,
  black: colors.black,
  
  tabIconDefault: colors.gray[500],
  tabIconSelected: colors.primary[400],
  tint: colors.primary[400],
};

export default {
  light: lightTheme,
  dark: darkTheme,
  colors,
};
