// Theme configuration for the mobile security app

export const COLORS = {
  // Primary colors
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  primaryLight: '#81C784',
  
  // Secondary colors
  secondary: '#2196F3',
  secondaryDark: '#1976D2',
  secondaryLight: '#64B5F6',
  
  // Background colors
  background: '#1a1a2e',
  backgroundSecondary: '#16213e',
  backgroundTertiary: '#0f3460',
  
  // Surface colors
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceSecondary: 'rgba(255, 255, 255, 0.1)',
  
  // Text colors
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textTertiary: '#888888',
  
  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Security severity colors
  severityHigh: '#F44336',
  severityMedium: '#FF9800',
  severityLow: '#4CAF50',
  severityInfo: '#2196F3',
  
  // Border colors
  border: '#333333',
  borderLight: 'rgba(255, 255, 255, 0.2)',
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.8)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
};

export const SIZES = {
  // Spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Border radius
  radiusXs: 4,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,
  radiusRound: 50,
  
  // Font sizes
  fontSizeXs: 10,
  fontSizeSm: 12,
  fontSizeMd: 14,
  fontSizeLg: 16,
  fontSizeXl: 18,
  fontSizeXxl: 20,
  fontSizeTitle: 24,
  fontSizeLarge: 28,
  
  // Icon sizes
  iconXs: 12,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,
  iconXxl: 48,
  
  // Component heights
  buttonHeight: 48,
  inputHeight: 48,
  tabBarHeight: 60,
  headerHeight: 56,
};

export const FONTS = {
  // Font weights
  light: '300',
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  
  // Font families (platform specific)
  family: {
    ios: 'System',
    android: 'Roboto',
  },
};

export const SHADOWS = {
  // Shadow configurations
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
};

export const GRADIENTS = {
  // Gradient configurations
  primary: ['#1a1a2e', '#16213e', '#0f3460'],
  secondary: ['#4CAF50', '#388E3C'],
  warning: ['#FF9800', '#F57C00'],
  error: ['#F44336', '#D32F2F'],
  success: ['#4CAF50', '#388E3C'],
};

export const ANIMATIONS = {
  // Animation durations
  fast: 200,
  normal: 300,
  slow: 500,
  
  // Easing functions
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
};

// Theme object for easy import
export const theme = {
  colors: COLORS,
  sizes: SIZES,
  fonts: FONTS,
  shadows: SHADOWS,
  gradients: GRADIENTS,
  animations: ANIMATIONS,
};

export default theme; 