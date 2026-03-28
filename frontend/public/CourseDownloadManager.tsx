import React, { useState } from 'react';
import { saveCourseOffline } from '../../utils/offlineDB';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface CourseDownloadProps {
  courseId: string;
  courseName: string;
  courseData: any; // Entire structure of the course to be saved locally
}

export const CourseDownloadManager: React.FC<CourseDownloadProps> = ({ courseId, courseName, courseData }) => {
  const { isOnline } = useNetworkStatus();
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);

  const startDownload = async () => {
    if (!isOnline) {
      alert('Cannot download courses while offline.');
      return;
    }

    try {
      setDownloadProgress(0);
      // Simulating a progressive download of course chunks/videos 
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setDownloadProgress(i);
      }

      await saveCourseOffline(courseId, courseData);
      setIsDownloaded(true);
      setDownloadProgress(null);
    } catch (err) {
      console.error('Failed to download course', err);
      setDownloadProgress(null);
      alert('Download failed. Please try again.');
    }
  };

  return (
    <div className="bg-white p-4 border rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">{courseName}</h3>
          <p className="text-sm text-gray-500">Available for offline study</p>
        </div>
        <button
          onClick={startDownload}
          disabled={downloadProgress !== null || isDownloaded || !isOnline}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isDownloaded ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500'
          }`}
        >
          {isDownloaded ? 'Downloaded' : downloadProgress !== null ? `Downloading ${downloadProgress}%` : 'Download Course'}
        </button>
      </div>
      {downloadProgress !== null && (
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${downloadProgress}%` }}></div>
        </div>
      )}
    </div>
  );
};