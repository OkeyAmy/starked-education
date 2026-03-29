const EventEmitter = require('events');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class CDNIntegration extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            provider: options.provider || 'cloudflare',
            apiKey: options.apiKey || process.env.CDN_API_KEY,
            zoneId: options.zoneId || process.env.CDN_ZONE_ID,
            accountId: options.accountId || process.env.CDN_ACCOUNT_ID,
            baseUrl: options.baseUrl || 'https://api.cloudflare.com/client/v4',
            edgeLocations: options.edgeLocations || [
                'us-east', 'us-west', 'eu-west', 'eu-central', 'asia-pacific'
            ],
            compression: options.compression !== false,
            minification: options.minification !== false,
            cacheHeaders: {
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Expires': new Date(Date.now() + 31536000000).toUTCString()
            },
            allowedMimeTypes: [
                'text/css',
                'text/javascript',
                'application/javascript',
                'image/png',
                'image/jpeg',
                'image/gif',
                'image/svg+xml',
                'image/webp',
                'font/woff',
                'font/woff2',
                'application/font-woff',
                'application/font-woff2'
            ]
        };

        this.metrics = {
            uploads: 0,
            downloads: 0,
            invalidations: 0,
            errors: 0,
            bytesTransferred: 0,
            averageLatency: 0,
            cacheHitRate: 0
        };

        this.uploadQueue = [];
        this.isProcessingQueue = false;
    }

    // Upload static asset to CDN
    async uploadAsset(key, content, options = {}) {
        const startTime = Date.now();
        
        try {
            const mimeType = this.getMimeType(key);
            if (!this.config.allowedMimeTypes.includes(mimeType)) {
                throw new Error(`MIME type ${mimeType} not allowed`);
            }

            // Process content (compression, minification)
            let processedContent = await this.processContent(content, mimeType, options);
            
            // Generate hash for integrity checking
            const hash = crypto.createHash('sha256').update(processedContent).digest('hex');
            
            // Upload to CDN
            const result = await this.uploadToCDN(key, processedContent, mimeType, hash, options);
            
            // Update metrics
            const latency = Date.now() - startTime;
            this.updateMetrics('uploads', latency, processedContent.length);
            
            this.emit('assetUploaded', { key, size: processedContent.length, latency });
            
            return {
                key,
                url: result.url,
                hash,
                size: processedContent.length,
                mimeType,
                cacheControl: this.config.cacheHeaders['Cache-Control']
            };
            
        } catch (error) {
            this.metrics.errors++;
            this.emit('error', { operation: 'upload', key, error });
            throw error;
        }
    }

    // Upload from file path
    async uploadFromFile(filePath, cdnKey = null, options = {}) {
        try {
            const content = await fs.readFile(filePath);
            const key = cdnKey || path.basename(filePath);
            return await this.uploadAsset(key, content, options);
        } catch (error) {
            this.emit('error', { operation: 'uploadFromFile', filePath, error });
            throw error;
        }
    }

    // Batch upload multiple assets
    async uploadAssets(assets, options = {}) {
        const results = [];
        const concurrency = options.concurrency || 5;
        
        // Process in batches
        for (let i = 0; i < assets.length; i += concurrency) {
            const batch = assets.slice(i, i + concurrency);
            const batchPromises = batch.map(async (asset) => {
                try {
                    if (typeof asset === 'string') {
                        // File path
                        return await this.uploadFromFile(asset, null, options);
                    } else if (asset.key && asset.content) {
                        // Direct content
                        return await this.uploadAsset(asset.key, asset.content, options);
                    } else if (asset.filePath) {
                        // Explicit file path
                        return await this.uploadFromFile(asset.filePath, asset.key, options);
                    }
                } catch (error) {
                    return { key: asset.key || asset.filePath, error: error.message };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        
        return results;
    }

    // Invalidate CDN cache
    async invalidateCache(keys, options = {}) {
        const startTime = Date.now();
        
        try {
            const invalidationKeys = Array.isArray(keys) ? keys : [keys];
            
            // Add to invalidation queue if rate limiting is a concern
            if (options.queue !== false) {
                this.uploadQueue.push(...invalidationKeys);
                if (!this.isProcessingQueue) {
                    this.processInvalidationQueue();
                }
                return { queued: true, count: invalidationKeys.length };
            }
            
            // Process immediately
            const result = await this.performInvalidation(invalidationKeys);
            
            const latency = Date.now() - startTime;
            this.updateMetrics('invalidations', latency);
            
            this.emit('cacheInvalidated', { keys: invalidationKeys, latency });
            
            return result;
            
        } catch (error) {
            this.metrics.errors++;
            this.emit('error', { operation: 'invalidate', keys, error });
            throw error;
        }
    }

    // Get asset from CDN
    async getAsset(key, options = {}) {
        const startTime = Date.now();
        
        try {
            const url = this.getAssetUrl(key);
            const response = await axios.get(url, {
                headers: {
                    'Accept-Encoding': 'gzip, deflate, br'
                },
                responseType: 'arraybuffer'
            });
            
            const latency = Date.now() - startTime;
            this.updateMetrics('downloads', latency, response.data.byteLength);
            
            // Check cache headers
            const cacheHit = response.headers['x-cache'] === 'HIT';
            if (cacheHit) {
                this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / 2;
            }
            
            this.emit('assetDownloaded', { key, size: response.data.byteLength, latency, cacheHit });
            
            return {
                key,
                content: response.data,
                mimeType: response.headers['content-type'],
                cacheHit,
                url
            };
            
        } catch (error) {
            this.metrics.errors++;
            this.emit('error', { operation: 'download', key, error });
            throw error;
        }
    }

    // Get asset URL
    getAssetUrl(key) {
        const baseUrl = this.config.baseUrl.replace('/api.cloudflare.com/client/v4', '');
        return `${baseUrl}/${key}`;
    }

    // Process content (compression, minification)
    async processContent(content, mimeType, options = {}) {
        let processedContent = content;
        
        // Convert to buffer if string
        if (typeof content === 'string') {
            processedContent = Buffer.from(content);
        }
        
        // Minification for text-based assets
        if (this.config.minification && this.isTextMimeType(mimeType)) {
            processedContent = await this.minifyContent(processedContent, mimeType);
        }
        
        // Compression
        if (this.config.compression && options.compress !== false) {
            processedContent = await this.compressContent(processedContent);
        }
        
        return processedContent;
    }

    // Minify content
    async minifyContent(content, mimeType) {
        // This would integrate with minification libraries
        // For now, return original content as placeholder
        return content;
    }

    // Compress content
    async compressContent(content) {
        const zlib = require('zlib');
        return new Promise((resolve, reject) => {
            zlib.gzip(content, { level: 9 }, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    // Upload to CDN provider
    async uploadToCDN(key, content, mimeType, hash, options) {
        switch (this.config.provider) {
            case 'cloudflare':
                return await this.uploadToCloudflare(key, content, mimeType, hash, options);
            case 'aws':
                return await this.uploadToAWS(key, content, mimeType, hash, options);
            default:
                throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
        }
    }

    // Upload to Cloudflare
    async uploadToCloudflare(key, content, mimeType, hash, options) {
        try {
            const url = `${this.config.baseUrl}/zones/${this.config.zoneId}/storage/kv/namespaces/assets/values/${key}`;
            
            const response = await axios.put(url, content, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': mimeType,
                    'Content-Encoding': this.config.compression ? 'gzip' : 'identity',
                    'Cache-Control': this.config.cacheHeaders['Cache-Control'],
                    'ETag': `"${hash}"`,
                    'X-Content-SHA256': hash
                }
            });
            
            if (response.data.success) {
                return {
                    url: this.getAssetUrl(key),
                    key,
                    provider: 'cloudflare'
                };
            } else {
                throw new Error(response.data.errors?.[0]?.message || 'Upload failed');
            }
            
        } catch (error) {
            throw new Error(`Cloudflare upload failed: ${error.message}`);
        }
    }

    // Upload to AWS CloudFront
    async uploadToAWS(key, content, mimeType, hash, options) {
        // This would integrate with AWS SDK
        // For now, return placeholder
        return {
            url: `https://cdn.example.com/${key}`,
            key,
            provider: 'aws'
        };
    }

    // Perform cache invalidation
    async performInvalidation(keys) {
        switch (this.config.provider) {
            case 'cloudflare':
                return await this.invalidateCloudflare(keys);
            case 'aws':
                return await this.invalidateAWS(keys);
            default:
                throw new Error(`Invalidation not supported for provider: ${this.config.provider}`);
        }
    }

    // Invalidate Cloudflare cache
    async invalidateCloudflare(keys) {
        try {
            const url = `${this.config.baseUrl}/zones/${this.config.zoneId}/purge_cache`;
            
            const response = await axios.post(url, {
                files: keys.map(key => this.getAssetUrl(key))
            }, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                return {
                    success: true,
                    id: response.data.result.id,
                    keys: keys.length
                };
            } else {
                throw new Error(response.data.errors?.[0]?.message || 'Invalidation failed');
            }
            
        } catch (error) {
            throw new Error(`Cloudflare invalidation failed: ${error.message}`);
        }
    }

    // Invalidate AWS CloudFront cache
    async invalidateAWS(keys) {
        // This would integrate with AWS SDK
        // For now, return placeholder
        return {
            success: true,
            id: 'aws-invalidation-id',
            keys: keys.length
        };
    }

    // Process invalidation queue
    async processInvalidationQueue() {
        if (this.isProcessingQueue || this.uploadQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        try {
            // Process in batches to respect rate limits
            const batchSize = 30; // Cloudflare limit
            while (this.uploadQueue.length > 0) {
                const batch = this.uploadQueue.splice(0, batchSize);
                await this.performInvalidation(batch);
                
                // Wait between batches
                if (this.uploadQueue.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } catch (error) {
            this.emit('error', { operation: 'processInvalidationQueue', error });
        } finally {
            this.isProcessingQueue = false;
        }
    }

    // Get MIME type for key
    getMimeType(key) {
        const ext = path.extname(key).toLowerCase();
        const mimeTypes = {
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2'
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
    }

    // Check if MIME type is text-based
    isTextMimeType(mimeType) {
        return mimeType.startsWith('text/') || 
               mimeType === 'application/javascript' || 
               mimeType === 'application/json';
    }

    // Update metrics
    updateMetrics(operation, latency, bytesTransferred = 0) {
        this.metrics[operation]++;
        this.metrics.bytesTransferred += bytesTransferred;
        
        // Update average latency
        this.metrics.averageLatency = 
            (this.metrics.averageLatency + latency) / 2;
    }

    // Get CDN metrics
    getMetrics() {
        return {
            ...this.metrics,
            queueSize: this.uploadQueue.length,
            isProcessingQueue: this.isProcessingQueue
        };
    }

    // Health check
    async healthCheck() {
        try {
            // Test CDN connectivity
            const testKey = 'health-check-' + Date.now();
            const testContent = Buffer.from('health-check');
            
            await this.uploadAsset(testKey, testContent);
            const result = await this.getAsset(testKey);
            await this.invalidateCache(testKey);
            
            return {
                status: 'healthy',
                provider: this.config.provider,
                latency: this.metrics.averageLatency,
                lastUpload: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                provider: this.config.provider,
                error: error.message
            };
        }
    }

    // Get CDN statistics
    async getStatistics() {
        try {
            // This would fetch real statistics from CDN provider
            // For now, return local metrics
            return {
                provider: this.config.provider,
                metrics: this.getMetrics(),
                edgeLocations: this.config.edgeLocations,
                compression: this.config.compression,
                minification: this.config.minification
            };
        } catch (error) {
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }
}

module.exports = CDNIntegration;
