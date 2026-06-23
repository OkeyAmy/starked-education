import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { performanceMonitor } from '@/lib/performance-monitor';
import { GlobalShell } from '@/components/PWA/GlobalShell';

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
  if (typeof window !== 'undefined') {
    performanceMonitor;
  }

  const locale = params?.locale ?? 'en';
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className={inter.className}>
        <GlobalShell />
        {children}
      </body>
    </html>
  );
}
