import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, File, Image, Video, Music, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import ipfsClient, { IpfsUploadOptions, IpfsUploadResult, UploadProgress } from '../lib/ipfs';

interface ContentUploaderProps {
  onUploadComplete?: (result: IpfsUploadResult) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
  authToken?: string;
}

interface FileWithPreview {
  file: File;
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress?: UploadProgress;
  result?: IpfsUploadResult;
  error?: string;
}

const ContentUploader: React.FC<ContentUploaderProps> = ({
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  maxSize = 100 * 1024 * 1024, // 100MB
  acceptedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf',
    'text/plain',
    'application/json',
    'text/markdown'
  ],
  className = '',
  disabled = false,
  authToken
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set auth token when provided
  React.useEffect(() => {
    if (authToken) {
      ipfsClient.setAuthToken(authToken);
    }
  }, [authToken]);

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (mimeType.includes('pdf') || mimeType.includes('text')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  // Generate file preview
  const generatePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return 'File type not supported';
    }
    if (file.size > maxSize) {
      return `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`;
    }
    return null;
  };

  // Add files to the list
  const addFiles = async (newFiles: FileList) => {
    const validFiles: FileWithPreview[] = [];
    
    for (let i = 0; i < newFiles.length && validFiles.length < maxFiles - files.length; i++) {
      const file = newFiles[i];
      const error = validateFile(file);
      
      if (error) {
        validFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          status: 'error',
          error
        });
      } else {
        const preview = await generatePreview(file);
        validFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          preview,
          status: 'pending'
        });
      }
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  // Remove file from list
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Upload all files
  const uploadFiles = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Upload files one by one
      for (const fileItem of pendingFiles) {
        try {
          // Update status to uploading
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'uploading' } : f
          ));

          const options: IpfsUploadOptions = {
            metadata: {
              originalName: fileItem.file.name,
              uploadedAt: new Date().toISOString(),
              userAgent: navigator.userAgent
            },
            onProgress: (progress) => {
              setFiles(prev => prev.map(f => 
                f.id === fileItem.id ? { ...f, progress } : f
              ));
            }
          };

          const result = await ipfsClient.uploadFile(fileItem.file, options);

          // Update status to completed
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'completed', result } : f
          ));

          onUploadComplete?.(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          
          // Update status to error
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'error', error: errorMessage } : f
          ));

          onUploadError?.(error as Error);
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [files, onUploadComplete, onUploadError]);

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!disabled && e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get overall progress
  const getOverallProgress = (): number => {
    const uploadingFiles = files.filter(f => f.status === 'uploading');
    if (uploadingFiles.length === 0) return 0;
    
    const totalProgress = uploadingFiles.reduce((sum, f) => sum + (f.progress?.progress || 0), 0);
    return Math.round(totalProgress / uploadingFiles.length);
  };

  return (
    <div className={`content-uploader ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop files here or click to upload
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Maximum {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each
        </p>
        <p className="text-xs text-gray-400">
          Supported formats: {acceptedTypes.join(', ')}
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-700">
              Files ({files.length})
            </h3>
            <button
              onClick={uploadFiles}
              disabled={disabled || isUploading || files.filter(f => f.status === 'pending').length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading... {getOverallProgress()}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Files
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                className={`border rounded-lg p-4 ${
                  fileItem.status === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0">
                    {fileItem.preview ? (
                      <img
                        src={fileItem.preview}
                        alt={fileItem.file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        {getFileIcon(fileItem.file.type)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fileItem.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(fileItem.file.size)} • {fileItem.file.type}
                        </p>
                      </div>

                      {/* Status Icon */}
                      <div className="flex items-center gap-2 ml-2">
                        {fileItem.status === 'pending' && (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                        )}
                        {fileItem.status === 'uploading' && (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        )}
                        {fileItem.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {fileItem.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <button
                          onClick={() => removeFile(fileItem.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {fileItem.status === 'uploading' && fileItem.progress && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${fileItem.progress.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFileSize(fileItem.progress.bytesLoaded)} / {formatFileSize(fileItem.progress.bytesTotal)}
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {fileItem.status === 'error' && fileItem.error && (
                      <p className="text-xs text-red-600 mt-1">{fileItem.error}</p>
                    )}

                    {/* Result Info */}
                    {fileItem.status === 'completed' && fileItem.result && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p>CID: <code className="bg-gray-100 px-1 rounded">{fileItem.result.cid}</code></p>
                        <p>Gateway: <a href={fileItem.result.gatewayUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View on IPFS</a></p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentUploader;
