'use client';

/**
 * GlobalPWA
 *
 * Mounts the global PWA UI chrome at the root of the app:
 *   - InstallBanner  (top-of-page bar with install CTA)
 *   - OfflineIndicator (bottom bar with sync info & quota warnings)
 *   - UpdateBanner   (banner when a new SW is waiting)
 *
 * It also registers the service worker on mount so the offline experience
 * is active outside of pages that explicitly do it.
 */

import { useEffect } from 'react';
import { InstallBanner, UpdateBanner } from './InstallPrompt';
import OfflineIndicator from './OfflineIndicator';

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  if (registrationPromise) return registrationPromise;

  const promise = navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .catch((err): ServiceWorkerRegistration | null => {
      console.warn('Service worker registration failed:', err);
      return null;
    });

  registrationPromise = promise;
  return promise;
}

export const GlobalPWA: React.FC = () => {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <>
      <InstallBanner />
      <UpdateBanner />
      <OfflineIndicator />
    </>
  );
};

export default GlobalPWA;
