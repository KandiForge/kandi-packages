'use client';

import React from 'react';
import { AuthProvider } from 'kandi-login';
import type { KandiLoginConfig } from 'kandi-login';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#050505',
      paper: '#121212',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  },
});

/**
 * Auth configuration pointing to the reference server.
 * Change authServerUrl to point to your own kandi-login server.
 */
const authConfig: KandiLoginConfig = {
  authServerUrl: 'https://kandi-packages-api.vercel.app',
  providers: [
    { id: 'google', name: 'Google' },
    { id: 'apple', name: 'Apple' },
  ],
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider config={authConfig}>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
