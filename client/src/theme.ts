import { createTheme } from '@mui/material/styles';

/**
 * The Dollars at Work look, kept from the original app.
 * Every screen and every chart takes its colors from here.
 */
export const brand = {
  green: '#19c37d', // mascot green: primary actions, positive numbers
  pink: '#ff4081', // accent
  red: '#ff5c5c', // debt, over budget
  blue: '#4aa8ff', // investments
  yellow: '#f5c518', // mascot hard hat: highlights, milestones
  background: '#181a20',
  surface: '#23272f',
  cardGradient: 'linear-gradient(135deg, #2a2e35 0%, #1f232a 100%)',
  headerGradient: 'linear-gradient(90deg, #23272f 0%, #181a20 100%)',
  wordmarkFont: 'Coiny, Poppins, Inter, sans-serif',
} as const;

/** Colors for chart series, in order. */
export const chartPalette = [brand.green, brand.blue, brand.yellow, brand.pink, '#a78bfa', '#2dd4bf', '#fb923c', '#94a3b8'];

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: brand.green, contrastText: '#0b1410' },
    secondary: { main: brand.pink },
    error: { main: brand.red },
    warning: { main: brand.yellow },
    info: { main: brand.blue },
    success: { main: brand.green },
    background: { default: brand.background, paper: brand.surface },
    text: { primary: '#e3e6eb', secondary: '#b0b8c1' },
    divider: 'rgba(255,255,255,0.08)',
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeightMedium: 600,
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700, letterSpacing: 0.3 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.3 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: brand.background },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      defaultProps: { elevation: 4 },
      styleOverrides: { root: { backgroundImage: brand.cardGradient } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10 },
        outlined: {
          backgroundColor: 'rgba(25,195,125,0.08)',
          borderColor: 'rgba(25,195,125,0.5)',
          '&:hover': { backgroundColor: 'rgba(25,195,125,0.15)' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
  },
});
