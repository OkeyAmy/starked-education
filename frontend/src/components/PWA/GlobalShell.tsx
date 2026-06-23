'use client';

/**
 * GlobalShell — client-side wrapper that mounts the persistent PWA chrome
 * (install banner, offline indicator, update banner) plus a fixed-position
 * LanguageSwitcher so it is available on every page WITHOUT stacking on top
 * of any in-page `<header>` elements that pages may already render.
 *
 * Mounted from both the pages router (`_app.tsx`) and the app router
 * (`app/layout.tsx`).
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { LanguageSwitcher } from '../LanguageSwitcher';

// GlobalPWA uses hooks that depend on `window`, so load it dynamically and
// disable SSR to avoid hydration mismatches.
const GlobalPWA = dynamic(() => import('./GlobalPWA').then((m) => m.GlobalPWA), {
  ssr: false,
});

export const GlobalShell: React.FC = () => {
  return (
    <>
      <GlobalPWA />
      {/* Fixed top-right LanguageSwitcher so it doesn't collide with
          page-level headers. Reasonable pointer-events / a11y settings
          are inherited from the LanguageSwitcher component itself. */}
      <div
        className="fixed top-2 right-2 z-40"
        style={{ pointerEvents: 'auto' }}
        role="region"
        aria-label="Language switcher"
      >
        <LanguageSwitcher variant="compact" />
      </div>
    </>
  );
};

export default GlobalShell;
