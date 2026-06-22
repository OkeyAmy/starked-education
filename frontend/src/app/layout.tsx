import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { performanceMonitor } from '@/lib/performance-monitor';
import RouteAnnouncer from '@/components/accessibility/RouteAnnouncer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StarkEd Education - Decentralized Learning Platform',
  description: 'Learn blockchain development with courses powered by Stellar',
};

// RTL locales
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params?: { locale?: string };
}) {
  const locale = params?.locale ?? 'en';
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className={inter.className}>
        {/*
          Skip-link: first focusable element so keyboard users can bypass
          navigation and jump straight to the main content. Hidden until
          focused via the .skip-link style in styles/globals.css.
          WCAG 2.4.1 (Bypass Blocks).
        */}
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {/*
          Polite route announcer: lets assistive technology know when the
          current page changes. Mirrors the role of pages/_app.tsx for the
          Pages Router.
          WCAG 4.1.3 (Status Messages).
        */}
        <RouteAnnouncer />
        {/*
          Main content landmark. Pages may opt out by rendering their own
          <main>; in that case remove this wrapper so we don't emit two.
        */}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
