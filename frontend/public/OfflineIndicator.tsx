import React from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-yellow-900 p-3 shadow-lg z-50 transform transition-transform" role="alert">
      <div className="max-w-7xl mx-auto flex items-center justify-center space-x-3">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
        </svg>
        <span className="font-medium">You are offline. Content will be loaded from cache and progress will sync automatically when reconnected.</span>
      </div>
    </div>
  );
};

export default OfflineIndicator;