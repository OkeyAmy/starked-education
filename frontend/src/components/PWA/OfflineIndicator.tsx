'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import {
  useOfflineSync,
  useStorageQuota,
} from '../../hooks/useOfflineSync';
import { WifiOff, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * OfflineIndicator
 *
 * - Shown at the bottom of the screen whenever the user is offline.
 * - Surfaces pending sync actions, sync errors, and storage quota warnings.
 * - All copy goes through `useTranslation()` so the indicator respects the
 *   active locale (including RTL languages).
 */
export const OfflineIndicator: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const { isOnline } = useNetworkStatus();
  const { syncStatus, triggerSync } = useOfflineSync();
  const quota = useStorageQuota();

  // i18n.dir() returns 'rtl' | 'ltr' based on the active language.
  const isRtl = i18n?.dir?.() === 'rtl' || i18n?.language?.startsWith('ar');

  if (isOnline) {
    // Only show storage warning when persistent storage isn't granted and
    // the browser has evicted us, but we still want to flag quota issues.
    if (!quota.isHighUsage) return null;

    return (
      <div
        className="fixed bottom-0 left-0 right-0 bg-amber-500 text-amber-900 p-3 shadow-lg z-50"
        role="alert"
        style={{ direction: isRtl ? 'rtl' : 'ltr' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">
            {t('pwa.offline.storageWarning', {
              defaultValue:
                'Storage almost full ({{percent}}%). Free up space or clear cached courses to avoid losing offline content.',
              percent: Math.round(quota.percent * 100),
            })}
          </span>
        </div>
      </div>
    );
  }

  const queuedCount = syncStatus.queuedItems;
  const hasErrors = syncStatus.syncErrors.length > 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-yellow-900 p-3 shadow-lg z-50"
      role="alert"
      style={{ direction: isRtl ? 'rtl' : 'ltr' }}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3">
        <WifiOff className="w-6 h-6 flex-shrink-0" />
        <span className="font-medium">
          {t('status.offline', { defaultValue: 'You are offline' })}.
          {queuedCount > 0 && (
            <>
              {' '}
              {t('pwa.offline.queuedActions', {
                count: queuedCount,
                defaultValue:
                  '{{count}} action pending sync will be sent when you reconnect.',
              })}
            </>
          )}
        </span>

        {syncStatus.isSyncing && (
          <span className="inline-flex items-center gap-1 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            {t('status.syncing', { defaultValue: 'Syncing…' })}
          </span>
        )}

        {hasErrors && (
          <span className="inline-flex items-center gap-1 text-sm text-red-700">
            <CloudOff className="w-4 h-4" />
            {t('pwa.offline.syncErrors', {
              count: syncStatus.syncErrors.length,
              defaultValue: '{{count}} sync error',
            })}
          </span>
        )}

        <button
          onClick={() => triggerSync()}
          className="ml-2 px-3 py-1 rounded bg-yellow-600 text-white text-sm hover:bg-yellow-700 transition-colors touch-manipulation"
          disabled={syncStatus.isSyncing}
        >
          {t('pwa.offline.retrySync', { defaultValue: 'Retry sync' })}
        </button>
      </div>
    </div>
  );
};

export default OfflineIndicator;
