'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { saveCourseOffline } from '../../utils/offlineDB';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface CourseDownloadProps {
  courseId: string;
  courseName: string;
  courseData: any; // Entire structure of the course to be saved locally
}

export const CourseDownloadManager: React.FC<CourseDownloadProps> = ({
  courseId,
  courseName,
  courseData,
}) => {
  const { t } = useTranslation('common');
  const { isOnline } = useNetworkStatus();
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);

  const startDownload = async () => {
    if (!isOnline) {
      // eslint-disable-next-line no-alert
      alert(t('pwa.offline.cannotDownload', {
        defaultValue: 'Cannot download courses while offline.',
      }));
      return;
    }

    try {
      setDownloadProgress(0);
      // Simulating a progressive download of course chunks/videos
      for (let i = 0; i <= 100; i += 20) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setDownloadProgress(i);
      }

      await saveCourseOffline(courseId, courseData);
      setIsDownloaded(true);
      setDownloadProgress(null);
    } catch (err) {
      console.error('Failed to download course', err);
      setDownloadProgress(null);
      // eslint-disable-next-line no-alert
      alert(t('pwa.offline.downloadFailed', {
        defaultValue: 'Download failed. Please try again.',
      }));
    }
  };

  const buttonLabel = isDownloaded
    ? t('pwa.offline.downloaded', { defaultValue: 'Downloaded' })
    : downloadProgress !== null
    ? t('pwa.offline.downloading', {
        defaultValue: 'Downloading {{percent}}%',
        percent: downloadProgress,
      })
    : t('pwa.offline.downloadCourse', { defaultValue: 'Download Course' });

  return (
    <div className="bg-white dark:bg-gray-800 p-4 border rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
            {courseName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('pwa.offline.courseAvailableOffline', {
              defaultValue: 'Available for offline study',
            })}
          </p>
        </div>
        <button
          onClick={startDownload}
          disabled={downloadProgress !== null || isDownloaded || !isOnline}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isDownloaded
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500'
          }`}
        >
          {buttonLabel}
        </button>
      </div>
      {downloadProgress !== null && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};
