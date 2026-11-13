import type { Metadata } from 'next';
import { Funnel_Display, Funnel_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';
import { ThemeProvider } from './ThemeProvider';

const funnelDisplay = Funnel_Display({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  variable: '--font-display-var',
  display: 'swap',
});

const funnelSans = Funnel_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans-var',
  display: 'swap',
});

const commitMono = localFont({
  src: [
    { path: '../../public/fonts/CommitMono-400-Regular.otf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/CommitMono-700-Regular.otf', weight: '700', style: 'normal' },
  ],
  variable: '--font-mono-var',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MIDAS Belize',
  description: 'Marine Integrated Decision Analysis System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${funnelDisplay.variable} ${funnelSans.variable} ${commitMono.variable}`}
    >
      <body>
        <NuqsAdapter>
          <ThemeProvider>{children}</ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
