import { createTheme, type Direction } from '@mui/material/styles'

// ─── Brand palette ────────────────────────────────────────────────────────────
const brandPurple      = '#7C5CFF'
const brandPurpleLight = '#EDE9FF'
const brandPurpleDark  = '#5438CC'

// ─── Builder ──────────────────────────────────────────────────────────────────
export function buildTheme(direction: Direction = 'rtl') {
  return createTheme({
    direction,

    palette: {
      primary: {
        main:         brandPurple,
        light:        brandPurpleLight,
        dark:         brandPurpleDark,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main:         '#FF6B6B',
        contrastText: '#FFFFFF',
      },
      background: {
        default: '#F4F3FF',   // very soft lavender
        paper:   '#FFFFFF',
      },
      text: {
        primary:   '#1A1A2E',
        secondary: '#6B7280',
      },
      success: { main: '#22C55E' },
      warning: { main: '#F59E0B' },
      error:   { main: '#EF4444' },
      divider: '#E5E7EB',
    },

    typography: {
      // Rubik supports Hebrew & Latin; fallback chain covers Windows/Android
      fontFamily: '"Rubik", "Segoe UI", Arial, sans-serif',
      h1: { fontSize: '1.75rem', fontWeight: 700 },
      h2: { fontSize: '1.375rem', fontWeight: 700 },
      h3: { fontSize: '1.125rem', fontWeight: 600 },
      h4: { fontSize: '1rem',     fontWeight: 600 },
      body1:   { fontSize: '0.9375rem' },
      body2:   { fontSize: '0.8125rem' },
      caption: { fontSize: '0.75rem'  },
    },

    shape: { borderRadius: 16 },

    shadows: [
      'none',
      '0 1px 4px rgba(124,92,255,0.06)',
      '0 2px 8px rgba(124,92,255,0.08)',
      '0 4px 16px rgba(124,92,255,0.10)',
      '0 6px 24px rgba(124,92,255,0.12)',
      // slots 5-24 — keep MUI defaults
      '0px 3px 5px -1px rgba(0,0,0,0.10),0px 5px 8px 0px rgba(0,0,0,0.07),0px 1px 14px 0px rgba(0,0,0,0.06)',
      '0px 3px 5px -1px rgba(0,0,0,0.10),0px 6px 10px 0px rgba(0,0,0,0.07),0px 1px 18px 0px rgba(0,0,0,0.06)',
      '0px 4px 5px -2px rgba(0,0,0,0.10),0px 7px 10px 1px rgba(0,0,0,0.07),0px 2px 16px 1px rgba(0,0,0,0.06)',
      '0px 5px 5px -3px rgba(0,0,0,0.10),0px 8px 10px 1px rgba(0,0,0,0.07),0px 3px 14px 2px rgba(0,0,0,0.06)',
      '0px 5px 6px -3px rgba(0,0,0,0.10),0px 9px 12px 1px rgba(0,0,0,0.07),0px 3px 16px 2px rgba(0,0,0,0.06)',
      '0px 6px 6px -3px rgba(0,0,0,0.10),0px 10px 14px 1px rgba(0,0,0,0.07),0px 4px 18px 3px rgba(0,0,0,0.06)',
      '0px 6px 7px -4px rgba(0,0,0,0.10),0px 11px 15px 1px rgba(0,0,0,0.07),0px 4px 20px 3px rgba(0,0,0,0.06)',
      '0px 7px 8px -4px rgba(0,0,0,0.10),0px 12px 17px 2px rgba(0,0,0,0.07),0px 5px 22px 4px rgba(0,0,0,0.06)',
      '0px 7px 8px -4px rgba(0,0,0,0.10),0px 13px 19px 2px rgba(0,0,0,0.07),0px 5px 24px 4px rgba(0,0,0,0.06)',
      '0px 7px 9px -4px rgba(0,0,0,0.10),0px 14px 21px 2px rgba(0,0,0,0.07),0px 5px 26px 4px rgba(0,0,0,0.06)',
      '0px 8px 9px -5px rgba(0,0,0,0.10),0px 15px 22px 2px rgba(0,0,0,0.07),0px 6px 28px 5px rgba(0,0,0,0.06)',
      '0px 8px 10px -5px rgba(0,0,0,0.10),0px 16px 24px 2px rgba(0,0,0,0.07),0px 6px 30px 5px rgba(0,0,0,0.06)',
      '0px 8px 11px -5px rgba(0,0,0,0.10),0px 17px 26px 2px rgba(0,0,0,0.07),0px 6px 32px 5px rgba(0,0,0,0.06)',
      '0px 9px 11px -5px rgba(0,0,0,0.10),0px 18px 28px 2px rgba(0,0,0,0.07),0px 7px 34px 6px rgba(0,0,0,0.06)',
      '0px 9px 12px -6px rgba(0,0,0,0.10),0px 19px 29px 2px rgba(0,0,0,0.07),0px 7px 36px 6px rgba(0,0,0,0.06)',
      '0px 10px 13px -6px rgba(0,0,0,0.10),0px 20px 31px 3px rgba(0,0,0,0.07),0px 8px 38px 7px rgba(0,0,0,0.06)',
      '0px 10px 13px -6px rgba(0,0,0,0.10),0px 21px 33px 3px rgba(0,0,0,0.07),0px 8px 40px 7px rgba(0,0,0,0.06)',
      '0px 10px 14px -6px rgba(0,0,0,0.10),0px 22px 35px 3px rgba(0,0,0,0.07),0px 8px 42px 7px rgba(0,0,0,0.06)',
      '0px 11px 14px -7px rgba(0,0,0,0.10),0px 23px 36px 3px rgba(0,0,0,0.07),0px 9px 44px 8px rgba(0,0,0,0.06)',
      '0px 11px 15px -7px rgba(0,0,0,0.10),0px 24px 38px 3px rgba(0,0,0,0.07),0px 9px 46px 8px rgba(0,0,0,0.06)',
    ],

    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, textTransform: 'none', fontWeight: 600 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 16, boxShadow: '0 2px 12px rgba(124,92,255,0.08)' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 16 },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: { borderTop: '1px solid #E5E7EB', height: 64 },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            minWidth: 'unset',
            '&.Mui-selected': { color: brandPurple },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600 },
        },
      },
    },
  })
}

// Pre-built themes — used by AppThemeProvider
export const rtlTheme = buildTheme('rtl')
export const ltrTheme = buildTheme('ltr')
