'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Visually hidden route-change announcer for the Next.js App Router.
 *
 * Mirrors the role of `pages/_app.tsx`'s `aria-live` status node so that
 * screen readers announce the new path every time the user navigates between
 * App-Router pages.
 *
 * WCAG 2.1 AA — SC 4.1.3 (Status Messages) satisfied via `aria-live="polite"`
 * with `aria-atomic="true"` and `role="status"`.
 */
const RouteAnnouncer: React.FC = () => {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Reset first so identical navigations (refresh / query change) still fire.
    setAnnouncement('');
    // usePathname() returns a string in Next 14, but bail out defensively so we
    // never schedule an rAF against a null/undefined value.
    if (!pathname) return undefined;
    const frame = window.requestAnimationFrame(() => {
      setAnnouncement(`Navigated to ${pathname}`);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

export default RouteAnnouncer;
