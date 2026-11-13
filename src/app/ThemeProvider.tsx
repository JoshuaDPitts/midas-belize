'use client';
import { Provider } from 'jotai';
import { useTheme } from '@/hooks/useTheme';

function ThemeSync({ children }: { children: React.ReactNode }) {
  useTheme();
  return <>{children}</>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      <ThemeSync>{children}</ThemeSync>
    </Provider>
  );
}
