const RedisCluster = require('./redisCluster');
const EventEmitter = require('events');
const crypto = require('crypto');

class MultiTierCache extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // L1 Cache (In-memory)
            l1: {
                maxSize: options.l1?.maxSize || 1000,
                ttl: options.l1?.ttl || 300000, // 5 minutes
                cleanupInterval: options.l1?.cleanupInterval || 60000 // 1 minute
            },
            
            // L2 Cache (Redis Cluster)
            l2: {
                nodes: options.l2?.nodes || [
                    { host: 'localhost', port: 6379 },
                    { host: 'localhost', port: 6380 },
                    { host: 'localhost', port: 6381 }
                ],
                replicas: options.l2?.replicas || 1,
                ttl: options.l2?.ttl || 3600000, // 1 hour
                keyPrefix: options.l2?.keyPrefix || 'cache:'
            },
            
            // L3 Cache (CDN)
            l3: {
                enabled: options.l3?.enabled || false,
                provider: options.l3?.provider || 'cloudflare',
                apiKey: options.l3?.apiKey,
                zoneId: options.l3?.zoneId,
                ttl: options.l3?.ttl || 86400000 // 24 hours
            },
            
            // Cache warming
            warming: {
                enabled: options.warming?.enabled || true,
                interval: options.warming?.interval || 300000, // 5 minutes
                strategy: options.warming?.strategy || 'predictive',
                threshold: options.warming?.threshold || 0.8
            },
            
            // Invalidation
            invalidation: {
                strategy: options.invalidation?.strategy || 'tag-based',
            }
        };

        // Initialize cache tiers
        this.l1Cache = new Map();
        this.l1AccessTimes = new Map();
        this.l1Tags = new Map();
        
        // Initialize Redis cluster
        this.redisCluster = new RedisCluster(this.config.l2);
        this.redisCluster.on('error', (error) => {
            this.emit('error', { tier: 'L2', error });
        });
        
        this.redisCluster.on('ready', () => {
            this.emit('ready', { tier: 'L2' });
        });

        // Metrics
        this.metrics = {
            l1: { hits: 0, misses: 0, sets: 0, deletes: 0 },
            l2: { hits: 0, misses: 0, sets: 0, deletes: 0 },
            l3: { hits: 0, misses: 0, sets: 0, deletes: 0 },
            totalRequests: 0,
            averageResponseTime: 0
        };

        // Start cleanup interval for L1 cache
        this.startL1Cleanup();
        
        // Start cache warming if enabled
        if (this.config.warming.enabled) {
            this.startCacheWarming();
        }
    }

    // Core cache operations
    async get(key, options = {}) {
        const startTime = Date.now();
        this.metrics.totalRequests++;

        try {
            // L1 Cache (In-memory)
            const l1Result = await this.getFromL1(key);
            if (l1Result !== null) {
                this.metrics.l1.hits++;
                this.updateResponseTime(startTime);
                return l1Result;
            }
            this.metrics.l1.misses++;

            // L2 Cache (Redis Cluster)
            const l2Result = await this.getFromL2(key);
            if (l2Result !== null) {
                this.metrics.l2.hits++;
                // Promote to L1 if space allows
                await this.setToL1(key, l2Result);
                this.updateResponseTime(startTime);
                return l2Result;
            }
            this.metrics.l2.misses++;

            // L3 Cache (CDN) - only for static assets
            if (this.config.l3.enabled && this.isStaticAsset(key)) {
                const l3Result = await this.getFromL3(key);
                if (l3Result !== null) {
                    this.metrics.l3.hits++;
                    // Promote to L2 and L1
                    await this.setToL2(key, l3Result);
                    await this.setToL1(key, l3Result);
                    this.updateResponseTime(startTime);
                    return l3Result;
                }
                this.metrics.l3.misses++;
            }

            this.updateResponseTime(startTime);
            return null;

        } catch (error) {
            this.emit('error', { operation: 'get', key, error });
            throw error;
        }
    }

    async set(key, value, options = {}) {
        try {
            const ttl = options.ttl || this.config.l1.ttl;
            const tags = options.tags || [];
            
            // Set in L1
            await this.setToL1(key, value, ttl, tags);
            
            // Set in L2
            await this.setToL2(key, value, options);
            
            // Set in L3 if it's a static asset and CDN is enabled
            if (this.config.l3.enabled && this.isStaticAsset(key)) {
                await this.setToL3(key, value, options);
            }

            this.emit('set', { key, tier: 'all' });
            
        } catch (error) {
            this.emit('error', { operation: 'set', key, error });
            throw error;
        }
    }

    async del(key, options = {}) {
        try {
            // Delete from all tiers
            await this.deleteFromL1(key);
            await this.deleteFromL2(key);
            
            if (this.config.l3.enabled && this.isStaticAsset(key)) {
                await this.deleteFromL3(key);
            }

            this.emit('delete', { key, tier: 'all' });
            
        } catch (error) {
            this.emit('error', { operation: 'delete', key, error });
            throw error;
        }
    }

    async invalidateByTag(tag) {
        try {
            // Invalidate from L1
            const l1Keys = this.l1Tags.get(tag) || [];
            for (const key of l1Keys) {
                this.l1Cache.delete(key);
                this.l1AccessTimes.delete(key);
            }
            this.l1Tags.delete(tag);

            // Invalidate from L2
            const pattern = `${this.config.l2.keyPrefix}tag:${tag}:*`;
            const keys = await this.redisCluster.keys(pattern);
            if (keys.length > 0) {
                await this.redisCluster.del(...keys);
            }

            this.emit('invalidated', { tag, keys: keys.length });
            
        } catch (error) {
            this.emit('error', { operation: 'invalidateByTag', tag, error });
            throw error;
        }
    }

    // L1 Cache (In-memory) methods
    async getFromL1(key) {
        const item = this.l1Cache.get(key);
        if (!item) return null;

        // Check TTL
        if (Date.now() > item.expiry) {
            this.l1Cache.delete(key);
            this.l1AccessTimes.delete(key);
            return null;
        }

        // Update access time for LRU
        this.l1AccessTimes.set(key, Date.now());
        return item.value;
    }

    async setToL1(key, value, ttl = this.config.l1.ttl, tags = []) {
        // Check if we need to evict items
        if (this.l1Cache.size >= this.config.l1.maxSize) {
            this.evictLRU();
        }

        const item = {
            value,
            expiry: Date.now() + ttl,
            tags
        };

        this.l1Cache.set(key, item);
        this.l1AccessTimes.set(key, Date.now());
        this.metrics.l1.sets++;

        // Update tag mappings
        for (const tag of tags) {
            if (!this.l1Tags.has(tag)) {
                this.l1Tags.set(tag, new Set());
            }
            this.l1Tags.get(tag).add(key);
        }
    }

    async deleteFromL1(key) {
        const item = this.l1Cache.get(key);
        if (item) {
            // Remove from tag mappings
            for (const tag of item.tags) {
                const tagKeys = this.l1Tags.get(tag);
                if (tagKeys) {
                    tagKeys.delete(key);
                    if (tagKeys.size === 0) {
                        this.l1Tags.delete(tag);
                    }
                }
            }
        }

        this.l1Cache.delete(key);
        this.l1AccessTimes.delete(key);
        this.metrics.l1.deletes++;
    }

    evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, time] of this.l1AccessTimes) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.deleteFromL1(oldestKey);
        }
    }

    // L2 Cache (Redis Cluster) methods
    async getFromL2(key) {
        try {
            const value = await this.redisCluster.get(`${this.config.l2.keyPrefix}${key}`);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            this.emit('error', { tier: 'L2', operation: 'get', key, error });
            return null;
        }
    }

    async setToL2(key, value, options = {}) {
        try {
            const ttl = options.ttl || this.config.l2.ttl;
            const tags = options.tags || [];
            const serializedValue = JSON.stringify(value);

            // Set the main value
            await this.redisCluster.set(
                `${this.config.l2.keyPrefix}${key}`,
                serializedValue,
                { px: ttl }
            );

            // Set tag mappings
            for (const tag of tags) {
                await this.redisCluster.sadd(
                    `${this.config.l2.keyPrefix}tag:${tag}`,
                    key
                );
                await this.redisCluster.expire(
                    `${this.config.l2.keyPrefix}tag:${tag}`,
                    Math.ceil(ttl / 1000)
                );
            }

            this.metrics.l2.sets++;
            
        } catch (error) {
            this.emit('error', { tier: 'L2', operation: 'set', key, error });
            throw error;
        }
    }

    async deleteFromL2(key) {
        try {
            await this.redisCluster.del(`${this.config.l2.keyPrefix}${key}`);
            this.metrics.l2.deletes++;
        } catch (error) {
            this.emit('error', { tier: 'L2', operation: 'delete', key, error });
            throw error;
        }
    }

    // L3 Cache (CDN) methods
    async getFromL3(key) {
        if (!this.config.l3.enabled) return null;

        try {
            // This would integrate with CDN API
            // For now, return null as placeholder
            return null;
        } catch (error) {
            this.emit('error', { tier: 'L3', operation: 'get', key, error });
            return null;
        }
    }

    async setToL3(key, value, options = {}) {
        if (!this.config.l3.enabled) return;

        try {
            // This would integrate with CDN API
            // For now, just emit an event
            this.emit('cdnSet', { key, value, options });
            this.metrics.l3.sets++;
        } catch (error) {
            this.emit('error', { tier: 'L3', operation: 'set', key, error });
            throw error;
        }
    }

    async deleteFromL3(key) {
        if (!this.config.l3.enabled) return;

        try {
            // This would integrate with CDN API
            this.emit('cdnDelete', { key });
            this.metrics.l3.deletes++;
        } catch (error) {
            this.emit('error', { tier: 'L3', operation: 'delete', key, error });
            throw error;
        }
    }

    // Cache warming strategies
    async startCacheWarming() {
        setInterval(async () => {
            try {
                await this.warmCache();
            } catch (error) {
                this.emit('error', { operation: 'cacheWarming', error });
            }
        }, this.config.warming.interval);
    }

    async warmCache() {
        if (this.config.warming.strategy === 'predictive') {
            await this.predictiveWarming();
        } else if (this.config.warming.strategy === 'access-pattern') {
            await this.accessPatternWarming();
        }
    }

    async predictiveWarming() {
        // Analyze access patterns and predict likely-to-be-accessed items
        const hotKeys = await this.identifyHotKeys();
        
        for (const key of hotKeys) {
            try {
                const value = await this.getFromL2(key);
                if (value && !this.l1Cache.has(key)) {
                    await this.setToL1(key, value);
                }
            } catch (error) {
                // Continue with other keys
            }
        }
    }

    async accessPatternWarming() {
        // Warm based on historical access patterns
        // This would integrate with analytics to identify patterns
        const patterns = await this.getAccessPatterns();
        
        for (const pattern of patterns) {
            if (pattern.probability > this.config.warming.threshold) {
                try {
                    const value = await this.getFromL2(pattern.key);
                    if (value) {
                        await this.setToL1(pattern.key, value);
                    }
                } catch (error) {
                    // Continue with other patterns
                }
            }
        }
    }

    async identifyHotKeys() {
        // This would analyze Redis keys to identify frequently accessed items
        // For now, return empty array as placeholder
        return [];
    }

    async getAccessPatterns() {
        // This would integrate with analytics service
        // For now, return empty array as placeholder
        return [];
    }

    // Utility methods
    isStaticAsset(key) {
        const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
        return staticExtensions.some(ext => key.includes(ext));
    }

    updateResponseTime(startTime) {
        const responseTime = Date.now() - startTime;
        this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime + responseTime) / 2;
    }

    startL1Cleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, item] of this.l1Cache) {
                if (now > item.expiry) {
                    this.deleteFromL1(key);
                }
            }
        }, this.config.l1.cleanupInterval);
    }

    // Metrics and monitoring
    getMetrics() {
        const l2Metrics = this.redisCluster.getMetrics();
        
        return {
            ...this.metrics,
            l1HitRate: this.metrics.l1.hits / (this.metrics.l1.hits + this.metrics.l1.misses) * 100,
            l2HitRate: this.metrics.l2.hits / (this.metrics.l2.hits + this.metrics.l2.misses) * 100,
            l3HitRate: this.metrics.l3.hits / (this.metrics.l3.hits + this.metrics.l3.misses) * 100,
            overallHitRate: (this.metrics.l1.hits + this.metrics.l2.hits + this.metrics.l3.hits) / this.metrics.totalRequests * 100,
            l1Size: this.l1Cache.size,
            l1MaxSize: this.config.l1.maxSize,
            l2Cluster: l2Metrics
        };
    }

    // Health check
    async healthCheck() {
        const l2Health = await this.redisCluster.healthCheck();
        
        return {
            l1: {
                status: 'healthy',
                size: this.l1Cache.size,
                maxSize: this.config.l1.maxSize
            },
            l2: l2Health,
            l3: {
                status: this.config.l3.enabled ? 'healthy' : 'disabled',
                provider: this.config.l3.provider
            },
            metrics: this.getMetrics()
        };
    }

    // Graceful shutdown
    async disconnect() {
        await this.redisCluster.disconnect();
        this.l1Cache.clear();
        this.l1AccessTimes.clear();
        this.l1Tags.clear();
    }
}

module.exports = MultiTierCache;
