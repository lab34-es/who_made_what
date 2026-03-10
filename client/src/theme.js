import { extendTheme } from '@mui/joy/styles';

const theme = extendTheme({
  fontFamily: {
    body: "'Inter', var(--joy-fontFamily-fallback)",
    display: "'Inter', var(--joy-fontFamily-fallback)",
    code: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
  },
  colorSchemes: {
    dark: {
      palette: {
        background: {
          body: '#0d1117',
          surface: '#161b22',
        },
        primary: {
          50: '#e6f6e6',
          100: '#c6e9c6',
          200: '#a3dba3',
          300: '#7dcd7d',
          400: '#5ec25e',
          500: '#3fb950',
          600: '#2ea043',
          700: '#238636',
          800: '#196c2e',
          900: '#0f5323',
        },
        neutral: {
          50: '#f0f6fc',
          100: '#c9d1d9',
          200: '#b1bac4',
          300: '#8b949e',
          400: '#6e7681',
          500: '#484f58',
          600: '#30363d',
          700: '#21262d',
          800: '#161b22',
          900: '#0d1117',
        },
        success: {
          400: '#39d353',
          500: '#2ea043',
          600: '#238636',
          700: '#196c2e',
          800: '#0e4429',
          900: '#006d32',
        },
        danger: {
          500: '#f85149',
        },
      },
    },
    light: {
      palette: {
        background: {
          body: '#ffffff',
          surface: '#f6f8fa',
        },
        primary: {
          500: '#2ea043',
          600: '#238636',
        },
        success: {
          400: '#2da44e',
          500: '#1a7f37',
          600: '#116329',
          700: '#044f1e',
          800: '#023b15',
          900: '#01260d',
        },
      },
    },
  },
  components: {
    JoyCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: theme.vars.palette.neutral[600],
          backgroundColor: theme.vars.palette.background.surface,
        }),
      },
    },
  },
});

export default theme;
