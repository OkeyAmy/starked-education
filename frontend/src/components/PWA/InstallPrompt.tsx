'use client';

/**
 * PWA Install Prompt Component
 *
 * - Tracks page visits in localStorage; only prompts after 3+ visits.
 * - Uses `useTranslation()` for all user-facing strings.
 * - Falls back to native prompt on Chromium browsers and a friendly alert
 *   with instructions on iOS (which has no `beforeinstallprompt` event).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X, Smartphone, Monitor, RefreshCw } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
  className?: string;
  /** Minimum number of visits before the prompt is shown. Default 3. */
  visitThreshold?: number;
}

const VISIT_KEY = 'starked-pwa-visit-routes';
const DISMISS_KEY = 'starked-pwa-install-dismissed';

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  onInstall,
  onDismiss,
  className = '',
  visitThreshold = 3,
}) => {
  const { t } = useTranslation('common');
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const getVisitCount = useCallback((): number => {
    // Track distinct AS PATHs visited in this session — closer to "3+ page
    // visits" than a per-mount counter, and resets when sessionStorage
    // expires (when the user closes the tab).
    try {
      const raw = sessionStorage.getItem(VISIT_KEY);
      const set: string[] = raw ? JSON.parse(raw) : [];
      return Array.isArray(set) ? set.length : 0;
    } catch (_) {
      return 0;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Record the current route as visited once.
    try {
      const path = window.location?.pathname || '/';
      const raw = sessionStorage.getItem(VISIT_KEY);
      const set: string[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(set) && !set.includes(path)) {
        set.push(path);
        sessionStorage.setItem(VISIT_KEY, JSON.stringify(set));
      } else if (!Array.isArray(set)) {
        sessionStorage.setItem(VISIT_KEY, JSON.stringify([path]));
      }
    } catch (_) {
      /* no-op */
    }
    const visits = getVisitCount();

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';

    const maybeShow = () => {
      if (dismissed || standalone) return;
      if (visits >= visitThreshold) {
        setShowPrompt(true);
      }
    };

    // Allow browsers a few seconds to fire `beforeinstallprompt`.
    const fallbackTimer = window.setTimeout(maybeShow, 5000);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      maybeShow();
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch (_) {
        /* no-op */
      }
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall, getVisitCount, visitThreshold]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        onInstall?.();
      }
      setShowPrompt(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch (_) {
      /* no-op */
    }
    onDismiss?.();
  };

  const handleIOSInstall = () => {
    const instructions = t('pwa.install.iosInstructions', {
      defaultValue:
        'To install StarkEd on your iOS device:\n\n1. Tap the Share button at the bottom of Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm installation\n\nThis will add StarkEd to your home screen for easy access!',
    });
    // eslint-disable-next-line no-alert
    alert(instructions);
  };

  // Don't show if already installed or standalone
  if (isInstalled || isStandalone) return null;

  // iOS installation instructions
  if (isIOS) {
    return (
      <div
        className={`fixed bottom-4 left-4 right-4 z-50 md:hidden ${className}`}
        role="dialog"
        aria-live="polite"
      >
        <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 max-w-sm mx-auto">
          <div className="flex items-start gap-3">
            <Smartphone className="w-6 h-6 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">
                {t('pwa.install.title', { defaultValue: 'Install StarkEd' })}
              </h3>
              <p className="text-sm text-blue-100 mb-3">
                {t('pwa.install.description', {
                  defaultValue:
                    'Get the full experience with our app! Install StarkEd on your device for offline access and push notifications.',
                })}
              </p>
              <button
                onClick={handleIOSInstall}
                className="w-full bg-white text-blue-600 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors touch-manipulation"
              >
                {t('pwa.install.iosButton', {
                  defaultValue: 'Learn How to Install',
                })}
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-blue-700 rounded transition-colors touch-manipulation"
              aria-label={t('pwa.install.dismiss', { defaultValue: 'Dismiss' })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop install prompt
  if (showPrompt && deferredPrompt) {
    return (
      <div
        className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}
        role="dialog"
        aria-live="polite"
      >
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                {t('pwa.install.title', { defaultValue: 'Install StarkEd' })}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {t('pwa.install.description', {
                  defaultValue:
                    'Install our app for the best experience! Get offline access, faster loading, and push notifications.',
                })}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Monitor className="w-4 h-4" />
                <span>
                  {t('pwa.install.platforms', {
                    defaultValue: 'Available for desktop and mobile',
                  })}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors touch-manipulation"
                >
                  {t('pwa.install.button', { defaultValue: 'Install App' })}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                >
                  {t('pwa.install.notNow', { defaultValue: 'Not Now' })}
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-gray-100 rounded transition-colors touch-manipulation"
              aria-label={t('pwa.install.dismiss', { defaultValue: 'Dismiss' })}
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// ---------------------------------------------------------------------------
// `usePWAInstall` hook — exposes current state to other UI surfaces.
// ---------------------------------------------------------------------------
export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStatus = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };

    checkStatus();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return { canInstall, isInstalled, isStandalone };
};

// ---------------------------------------------------------------------------
// Compact banner shown at the top of pages — uses translation.
// ---------------------------------------------------------------------------
export const InstallBanner: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const { t } = useTranslation('common');
  const { canInstall, isInstalled } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true); // start true to avoid flash

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (!canInstall || isInstalled || dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch (_) {
      /* no-op */
    }
    setDismissed(true);
  };

  return (
    <div
      className={`bg-blue-50 border-b border-blue-200 px-4 py-2 ${className}`}
      role="banner"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Download className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm text-blue-800 truncate">
            {t('pwa.banner.message', {
              defaultValue:
                'Install StarkEd for offline access and notifications',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="text-blue-600 hover:text-blue-800 text-sm touch-manipulation"
          >
            {t('pwa.banner.dismiss', { defaultValue: 'Dismiss' })}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Banner shown when a new version of the service worker is waiting.
// ---------------------------------------------------------------------------
export const UpdateBanner: React.FC = () => {
  const { t } = useTranslation('common');
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const onUpdate = (registration: ServiceWorkerRegistration) => {
      setWaitingWorker(registration.waiting ?? null);
    };

    navigator.serviceWorker.ready.then(onUpdate).catch(() => {
      /* no-op */
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // A new SW has taken control – reload to use the latest assets.
      window.location.reload();
    });
  }, []);

  if (!waitingWorker) return null;

  const applyUpdate = () => {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <div
      className="bg-amber-50 border-b border-amber-200 px-4 py-2"
      role="status"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <RefreshCw className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800 truncate">
            {t('pwa.update.available', {
              defaultValue: 'A new version of StarkEd is available.',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={applyUpdate}
            className="bg-amber-600 text-white px-3 py-1 rounded text-sm hover:bg-amber-700 transition-colors"
          >
            {t('pwa.update.reload', { defaultValue: 'Reload' })}
          </button>
        </div>
      </div>
    </div>
  );
};
