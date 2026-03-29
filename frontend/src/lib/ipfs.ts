import axios from 'axios';

// Types for IPFS operations
export interface IpfsUploadOptions {
  metadata?: Record<string, any>;
  includeMetadata?: boolean;
  wrapWithDirectory?: boolean;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadProgress {
  progress: number;
  bytesLoaded: number;
  bytesTotal: number;
  isComplete: boolean;
  fileIndex?: number;
  totalFiles?: number;
  overallProgress?: number;
}

export interface IpfsUploadResult {
  cid: string;
  metadataCid?: string;
  metadata: Record<string, any>;
  size: number;
  gatewayUrl: string;
}

export interface IpfsContentResult {
  cid: string;
  content: string | ArrayBuffer;
  size: number;
  contentType?: string;
}

export interface IpfsMetadata {
  name: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  contentHash: string;
  uploader?: {
    id: string;
    username: string;
    address: string;
  };
  [key: string]: any;
}

export interface IpfsNodeInfo {
  version: {
    version: string;
    commit: string;
    repo: string;
  };
  id: {
    id: string;
    addresses: string[];
  };
  repo: {
    numObjects: number;
    repoSize: number;
    storageMax: number;
  };
  config: {
    host: string;
    port: number;
    protocol: string;
  };
}

export interface IpfsCacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  cacheSize: number;
}

export interface IpfsError extends Error {
  operation?: string;
  details?: any;
  isIpfsError?: boolean;
}

/**
 * Frontend IPFS Client
 * Provides a clean interface for interacting with the IPFS backend API
 */
class IpfsClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string = 'http://localhost:3001/api/content') {
    this.baseURL = baseURL;
  }

  /**
   * Set authentication token for IPFS operations
   * @param token - JWT token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Handle IPFS API errors
   */
  private handleError(error: any): IpfsError {
    if (error.response) {
      const { data, status } = error.response;
      
      if (data.isIpfsError) {
        const ipfsError = new Error(data.message) as IpfsError;
        ipfsError.operation = data.operation;
        ipfsError.details = data.details;
        ipfsError.isIpfsError = true;
        return ipfsError;
      }

      const apiError = new Error(data.message || 'API request failed') as IpfsError;
      apiError.details = { status, data };
      return apiError;
    }

    const networkError = new Error('Network error occurred') as IpfsError;
    networkError.details = error;
    return networkError;
  }

  /**
   * Upload a single file to IPFS
   * @param file - File to upload
   * @param options - Upload options
   * @returns Promise<IpfsUploadResult>
   */
  async uploadFile(file: File, options: IpfsUploadOptions = {}): Promise<IpfsUploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Add metadata if provided
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      // Add other options
      if (options.includeMetadata !== undefined) {
        formData.append('includeMetadata', options.includeMetadata.toString());
      }
      if (options.wrapWithDirectory !== undefined) {
        formData.append('wrapWithDirectory', options.wrapWithDirectory.toString());
      }

      const response = await axios.post(`${this.baseURL}/upload`, formData, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (options.onProgress && progressEvent.total) {
            const progress = {
              progress: Math.round((progressEvent.loaded * 100) / progressEvent.total),
              bytesLoaded: progressEvent.loaded,
              bytesTotal: progressEvent.total,
              isComplete: progressEvent.loaded >= progressEvent.total,
            };
            options.onProgress(progress);
          }
        },
      });

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Upload multiple files to IPFS
   * @param files - Files to upload
   * @param options - Upload options
   * @returns Promise<Array<Partial<IpfsUploadResult> & { success: boolean; error?: string }>>
   */
  async uploadMultipleFiles(
    files: File[], 
    options: IpfsUploadOptions = {}
  ): Promise<Array<Partial<IpfsUploadResult> & { success: boolean; error?: string }>> {
    try {
      const formData = new FormData();
      
      // Add all files
      files.forEach(file => {
        formData.append('files', file);
      });

      // Add metadata if provided
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      // Add other options
      if (options.includeMetadata !== undefined) {
        formData.append('includeMetadata', options.includeMetadata.toString());
      }
      if (options.wrapWithDirectory !== undefined) {
        formData.append('wrapWithDirectory', options.wrapWithDirectory.toString());
      }

      const response = await axios.post(`${this.baseURL}/upload/batch`, formData, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (options.onProgress && progressEvent.total) {
            const progress = {
              progress: Math.round((progressEvent.loaded * 100) / progressEvent.total),
              bytesLoaded: progressEvent.loaded,
              bytesTotal: progressEvent.total,
              isComplete: progressEvent.loaded >= progressEvent.total,
              fileIndex: 0, // Will be updated by backend
              totalFiles: files.length,
              overallProgress: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            };
            options.onProgress(progress);
          }
        },
      });

      return response.data.data.results;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Retrieve content from IPFS
   * @param cid - IPFS CID
   * @param format - Response format ('buffer', 'base64', 'stream')
   * @param bypassCache - Whether to bypass cache
   * @returns Promise<IpfsContentResult>
   */
  async getContent(
    cid: string, 
    format: 'buffer' | 'base64' | 'stream' = 'buffer',
    bypassCache: boolean = false
  ): Promise<IpfsContentResult> {
    try {
      const params = new URLSearchParams({
        format,
        ...(bypassCache && { bypassCache: 'true' }),
      });

      const response = await axios.get(`${this.baseURL}/${cid}?${params}`, {
        headers: this.getAuthHeaders(),
        responseType: format === 'buffer' ? 'arraybuffer' : 'json',
      });

      if (format === 'base64') {
        return response.data.data;
      } else {
        // For buffer and stream formats
        return {
          cid,
          content: response.data,
          size: response.data.byteLength || 0,
        };
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Retrieve metadata for IPFS content
   * @param cid - IPFS CID
   * @param metadataCid - Metadata CID
   * @returns Promise<IpfsMetadata>
   */
  async getMetadata(cid: string, metadataCid: string): Promise<IpfsMetadata> {
    try {
      const params = new URLSearchParams({ metadataCid });
      const response = await axios.get(`${this.baseURL}/${cid}/metadata?${params}`, {
        headers: this.getAuthHeaders(),
      });

      return response.data.data.metadata;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Pin content to IPFS
   * @param cid - IPFS CID to pin
   * @returns Promise<{ cid: string; pinned: boolean; timestamp: string }>
   */
  async pinContent(cid: string): Promise<{ cid: string; pinned: boolean; timestamp: string }> {
    try {
      const response = await axios.post(`${this.baseURL}/${cid}/pin`, {}, {
        headers: this.getAuthHeaders(),
      });

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Unpin content from IPFS
   * @param cid - IPFS CID to unpin
   * @returns Promise<{ cid: string; unpinned: boolean; timestamp: string }>
   */
  async unpinContent(cid: string): Promise<{ cid: string; unpinned: boolean; timestamp: string }> {
    try {
      const response = await axios.delete(`${this.baseURL}/${cid}/pin`, {
        headers: this.getAuthHeaders(),
      });

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get IPFS node information
   * @returns Promise<IpfsNodeInfo>
   */
  async getNodeInfo(): Promise<IpfsNodeInfo> {
    try {
      const response = await axios.get(`${this.baseURL}/node/info`, {
        headers: this.getAuthHeaders(),
      });

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get cache statistics
   * @returns Promise<IpfsCacheStats>
   */
  async getCacheStats(): Promise<IpfsCacheStats> {
    try {
      const response = await axios.get(`${this.baseURL}/cache/stats`, {
        headers: this.getAuthHeaders(),
      });

      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Clear cache
   * @returns Promise<{ message: string }>
   */
  async clearCache(): Promise<{ message: string }> {
    try {
      const response = await axios.delete(`${this.baseURL}/cache`, {
        headers: this.getAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check IPFS service health
   * @returns Promise<{ success: boolean; status: string; data?: any }>
   */
  async checkHealth(): Promise<{ success: boolean; status: string; data?: any }> {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Format IPFS hash for gateway access
   * @param cid - IPFS CID
   * @param gatewayUrl - Custom gateway URL (optional)
   * @returns Gateway URL string
   */
  static formatGatewayUrl(cid: string, gatewayUrl: string = 'https://ipfs.io/ipfs/'): string {
    return `${gatewayUrl}${cid}`;
  }

  /**
   * Extract IPFS hash from gateway URL
   * @param gatewayUrl - Gateway URL
   * @returns IPFS hash or null
   */
  static extractHashFromGatewayUrl(gatewayUrl: string): string | null {
    const match = gatewayUrl.match(/\/ipfs\/(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Validate IPFS CID format
   * @param cid - IPFS CID to validate
   * @returns boolean indicating validity
   */
  static isValidCid(cid: string): boolean {
    if (!cid || typeof cid !== 'string') {
      return false;
    }

    // Basic CID validation (can be enhanced with proper CID library)
    const hash = this.extractHashFromGatewayUrl(cid) || cid;
    return /^[a-zA-Z0-9]{46,}$/.test(hash);
  }
}

// Create singleton instance
const ipfsClient = new IpfsClient();

export default ipfsClient;
export { IpfsClient };
