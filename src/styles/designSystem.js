/**
 * Design System Configuration
 * Central place for all design tokens, colors, spacing, typography
 */

export const designSystem = {
  // Color Palette
  colors: {
    // Primary (Blue) - Main brand color
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',  // Main
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    
    // Success (Green)
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',  // Main
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
    },
    
    // Warning (Yellow/Orange)
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',  // Main
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    
    // Error (Red)
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',  // Main
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },
    
    // Info (Cyan)
    info: {
      50: '#ECFEFF',
      100: '#CFFAFE',
      200: '#A5F3FC',
      300: '#67E8F9',
      400: '#22D3EE',
      500: '#06B6D4',  // Main
      600: '#0891B2',
      700: '#0E7490',
      800: '#155E75',
      900: '#164E63',
    },
    
    // Neutrals (Gray)
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    
    // Special colors
    white: '#FFFFFF',
    black: '#000000',
  },
  
  // Typography
  typography: {
    fontFamily: {
      primary: "'Tajawal', 'Almarai', sans-serif",  // Arabic
      secondary: "'Inter', 'SF Pro Display', -apple-system, sans-serif",  // English
      mono: "'Fira Code', 'Courier New', monospace",
    },
    
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },
  
  // Spacing (consistent 8px grid)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },
  
  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    base: '0.5rem',  // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    '2xl': '2rem',   // 32px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },
  
  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Z-Index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// Risk Level Colors
export const riskLevels = {
  low: {
    bg: designSystem.colors.success[50],
    text: designSystem.colors.success[700],
    border: designSystem.colors.success[200],
    icon: '✓',
    label: 'منخفض',
    labelEn: 'Low',
  },
  medium: {
    bg: designSystem.colors.warning[50],
    text: designSystem.colors.warning[700],
    border: designSystem.colors.warning[200],
    icon: '⚠',
    label: 'متوسط',
    labelEn: 'Medium',
  },
  high: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#FCD34D',
    icon: '⚡',
    label: 'عالي',
    labelEn: 'High',
  },
  critical: {
    bg: designSystem.colors.error[50],
    text: designSystem.colors.error[700],
    border: designSystem.colors.error[200],
    icon: '✗',
    label: 'حرج',
    labelEn: 'Critical',
  },
};

// Question Type Colors
export const questionTypes = {
  StaticDataLinked: {
    bg: designSystem.colors.primary[50],
    text: designSystem.colors.primary[700],
    border: designSystem.colors.primary[200],
    icon: '📊',
    label: 'مربوط بالبيانات',
    labelEn: 'Static Data',
  },
  MultiChoice: {
    bg: '#F3E8FF',
    text: '#6B21A8',
    border: '#D8B4FE',
    icon: '☑',
    label: 'اختيار متعدد',
    labelEn: 'Multi-Choice',
  },
  YesNo: {
    bg: designSystem.colors.success[50],
    text: designSystem.colors.success[700],
    border: designSystem.colors.success[200],
    icon: '✓/✗',
    label: 'نعم/لا',
    labelEn: 'Yes/No',
  },
  Manual: {
    bg: designSystem.colors.warning[50],
    text: designSystem.colors.warning[700],
    border: designSystem.colors.warning[200],
    icon: '✎',
    label: 'إدخال يدوي',
    labelEn: 'Manual',
  },
  ParentChild: {
    bg: designSystem.colors.info[50],
    text: designSystem.colors.info[700],
    border: designSystem.colors.info[200],
    icon: '↳',
    label: 'سؤال فرعي',
    labelEn: 'Conditional',
  },
};

// Status Colors
export const statusColors = {
  draft: {
    bg: designSystem.colors.neutral[50],
    text: designSystem.colors.neutral[700],
    border: designSystem.colors.neutral[300],
    label: 'مسودة',
    labelEn: 'Draft',
  },
  submitted: {
    bg: designSystem.colors.info[50],
    text: designSystem.colors.info[700],
    border: designSystem.colors.info[200],
    label: 'مرسل',
    labelEn: 'Submitted',
  },
  approved: {
    bg: designSystem.colors.success[50],
    text: designSystem.colors.success[700],
    border: designSystem.colors.success[200],
    label: 'معتمد',
    labelEn: 'Approved',
  },
  rejected: {
    bg: designSystem.colors.error[50],
    text: designSystem.colors.error[700],
    border: designSystem.colors.error[200],
    label: 'مرفوض',
    labelEn: 'Rejected',
  },
};

export default designSystem;
