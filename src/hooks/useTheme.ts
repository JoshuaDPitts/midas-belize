'use client';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { themeAtom, type Theme } from '@/atoms';

export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom);

  // Keep the document attribute in sync so CSS [data-theme=...] selectors work.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, setTheme, toggleTheme };
}

export type { Theme };
