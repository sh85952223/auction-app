import { createTheme, alpha } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c6aff',
      light: '#a599ff',
      dark: '#5a49e0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#1a1000',
    },
    error: {
      main: '#f87171',
      light: '#fca5a5',
      dark: '#ef4444',
      contrastText: '#ffffff',
    },
    success: {
      main: '#34d399',
      contrastText: '#ffffff',
    },
    background: {
      default: '#07080f',
      paper: '#131520',
    },
    text: {
      primary: '#f0f0f8',
      secondary: '#8b8da8',
      disabled: '#4a4b60',
    },
    divider: 'rgba(255,255,255,0.1)',
    action: {
      hover: 'rgba(255,255,255,0.05)',
      selected: 'rgba(124,106,255,0.12)',
      disabledBackground: 'rgba(255,255,255,0.04)',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    button: {
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,106,255,0.08) 0%, transparent 60%)',
          WebkitFontSmoothing: 'antialiased',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          minHeight: 42,
          borderRadius: 10,
          fontSize: '0.9rem',
        },
        sizeLarge: {
          minHeight: 52,
          fontSize: '0.95rem',
          padding: '0.85rem 1.75rem',
        },
        containedPrimary: {
          boxShadow: '0 2px 8px rgba(124,106,255,0.3)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(124,106,255,0.5)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
        },
        containedSecondary: {
          color: '#1a1000',
          boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
            transform: 'translateY(-1px)',
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(124,106,255,0.5)',
          '&:hover': {
            backgroundColor: 'rgba(124,106,255,0.1)',
            borderColor: '#7c6aff',
          },
        },
        outlinedError: {
          borderColor: 'rgba(248,113,113,0.4)',
          '&:hover': {
            backgroundColor: 'rgba(248,113,113,0.1)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.04)',
          transition: 'border-color 0.18s, box-shadow 0.18s',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.1)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.18)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#7c6aff',
            borderWidth: 1,
            boxShadow: '0 0 0 3px rgba(124,106,255,0.15)',
          },
        },
        input: {
          '&::placeholder': {
            color: '#4a4b60',
            opacity: 1,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#131520',
          border: '1px solid rgba(255,255,255,0.1)',
        },
        elevation9: {
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          fontFamily: "'Inter', sans-serif",
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          fontFamily: "'Inter', sans-serif",
        },
      },
    },
  },
});

export default theme;
export { alpha };
