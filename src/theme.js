import { createTheme, alpha } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1A3626', // Forest Green (--accent-green)
      light: '#3d5c49',
      dark: '#0c1d13',
      contrastText: '#FCFAF8', // Paper background (--bg-paper)
    },
    secondary: {
      main: '#B54F35', // Rust Red (--accent-rust)
      light: '#c8725d',
      dark: '#853320',
      contrastText: '#FCFAF8',
    },
    error: {
      main: '#B54F35', // Use rust/red for errors/warnings in this theme
      light: '#fca5a5',
      dark: '#853320',
      contrastText: '#ffffff',
    },
    success: {
      main: '#1A3626', // forest green also fits success
      contrastText: '#ffffff',
    },
    background: {
      default: '#F4F1EC', // Cream (--bg-cream)
      paper: '#FCFAF8', // Paper (--bg-paper)
    },
    text: {
      primary: '#1A1A1A', // Dark Gray (--text-dark)
      secondary: '#807D78', // Muted Gray (--text-muted)
      disabled: '#b0aeaa',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
    action: {
      hover: 'rgba(0, 0, 0, 0.03)',
      selected: 'rgba(26, 54, 38, 0.06)',
      disabledBackground: 'rgba(0, 0, 0, 0.04)',
    },
  },
  typography: {
    fontFamily: "'Pretendard', -apple-system, sans-serif",
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    button: {
      textTransform: 'none',
      fontWeight: 700,
    },
    h1: {
      fontFamily: "'Noto Serif KR', serif",
    },
    h2: {
      fontFamily: "'Noto Serif KR', serif",
    },
    h3: {
      fontFamily: "'Noto Serif KR', serif",
    },
    h4: {
      fontFamily: "'Noto Serif KR', serif",
    },
    h5: {
      fontFamily: "'Noto Serif KR', serif",
    },
    h6: {
      fontFamily: "'Noto Serif KR', serif",
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#e5e0d8',
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(26, 54, 38, 0.04) 0%, transparent 60%)',
          WebkitFontSmoothing: 'antialiased',
          color: '#1A1A1A',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          minHeight: 42,
          borderRadius: 100, // Round buttons in mockup
          fontSize: '0.9rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        sizeLarge: {
          minHeight: 52,
          fontSize: '0.95rem',
          padding: '0.85rem 1.75rem',
        },
        containedPrimary: {
          boxShadow: '0 4px 12px rgba(26, 54, 38, 0.15)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(26, 54, 38, 0.25)',
            transform: 'translateY(-1px)',
            backgroundColor: '#0c1d13',
          },
          '&:active': { transform: 'translateY(0)' },
        },
        containedSecondary: {
          color: '#FCFAF8',
          boxShadow: '0 4px 12px rgba(181, 79, 53, 0.15)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(181, 79, 53, 0.25)',
            transform: 'translateY(-1px)',
            backgroundColor: '#853320',
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(26, 54, 38, 0.3)',
          '&:hover': {
            backgroundColor: 'rgba(26, 54, 38, 0.04)',
            borderColor: '#1A3626',
          },
        },
        outlinedError: {
          borderColor: 'rgba(181, 79, 53, 0.3)',
          '&:hover': {
            backgroundColor: 'rgba(181, 79, 53, 0.04)',
            borderColor: '#B54F35',
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
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          transition: 'border-color 0.18s, box-shadow 0.18s',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.08)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.15)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1A3626',
            borderWidth: 1,
            boxShadow: '0 0 0 3px rgba(26, 54, 38, 0.08)',
          },
        },
        input: {
          '&::placeholder': {
            color: '#807D78',
            opacity: 0.8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FCFAF8',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        },
        elevation9: {
          boxShadow: '0 12px 40px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          fontFamily: "'Pretendard', sans-serif",
          borderRadius: 8,
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          fontFamily: "'Pretendard', sans-serif",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(252, 250, 248, 0.94) !important', // Paper with opacity
          borderBottom: '1px solid rgba(0, 0, 0, 0.08) !important',
          color: '#1A1A1A !important',
        },
      },
    },
  },
});

export default theme;
export { alpha };
