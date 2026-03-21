import React, { createContext, useContext, useMemo } from 'react';

type ThemeMode = 'dark';

type ThemeContextType = {
  theme: ThemeMode;
  isDark: true;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<ThemeContextType>(
    () => ({
      theme: 'dark',
      isDark: true,
      setTheme: () => {},
      toggleTheme: () => {},
    }),
    []
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
