const Redis = require('redis');
const EventEmitter = require('events');
const cluster = require('cluster');

class RedisCluster extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            nodes: options.nodes || [
                { host: 'localhost', port: 6379 },
                { host: 'localhost', port: 6380 },
                { host: 'localhost', port: 6381 }
            ],
            replicas: options.replicas || 1,
            keyDistribution: options.keyDistribution || 'crc16',
            connectionTimeout: options.connectionTimeout || 10000,
            commandTimeout: options.commandTimeout || 5000,
            retryDelayOnFailover: options.retryDelayOnFailover || 100,
            maxRetriesPerRequest: options.maxRetriesPerRequest || 3,
            lazyConnect: options.lazyConnect || true,
            enableOfflineQueue: options.enableOfflineQueue || false,
            ...options
        };

        this.nodes = new Map();
        this.slots = new Array(16384).fill(null);
        this.isReady = false;
        this.connectionPool = new Map();
        this.metrics = {
            hits: 0,
            misses: 0,
            errors: 0,
            commands: 0,
            latency: []
        };

        this.initializeCluster();
    }

    async initializeCluster() {
        try {
            // Initialize master nodes
            for (let i = 0; i < this.config.nodes.length; i++) {
                const nodeConfig = this.config.nodes[i];
                const client = Redis.createClient({
                    socket: {
                        host: nodeConfig.host,
                        port: nodeConfig.port,
                        connectTimeout: this.config.connectionTimeout
                    },
                    retryDelayOnFailover: this.config.retryDelayOnFailover,
                    maxRetriesPerRequest: this.config.maxRetriesPerRequest,
                    lazyConnect: this.config.lazyConnect,
                    enableOfflineQueue: this.config.enableOfflineQueue
                });

                client.on('error', (err) => {
                    this.metrics.errors++;
                    this.emit('error', { node: nodeConfig, error: err });
                });

                client.on('connect', () => {
                    this.emit('nodeConnected', nodeConfig);
                });

                client.on('ready', () => {
                    this.emit('nodeReady', nodeConfig);
                });

                await client.connect();
                this.nodes.set(`${nodeConfig.host}:${nodeConfig.port}`, client);
                this.connectionPool.set(`${nodeConfig.host}:${nodeConfig.port}`, {
                    client,
                    lastUsed: Date.now(),
                    activeConnections: 0
                });
            }

            // Setup slot mapping
            await this.setupSlotMapping();
            
            // Setup replication
            await this.setupReplication();
            
            this.isReady = true;
            this.emit('ready');

        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async setupSlotMapping() {
        const nodeArray = Array.from(this.nodes.keys());
        const slotsPerNode = Math.floor(16384 / nodeArray.length);
        
        for (let i = 0; i < 16384; i++) {
            const nodeIndex = Math.floor(i / slotsPerNode) % nodeArray.length;
            this.slots[i] = nodeArray[nodeIndex];
        }
    }

    async setupReplication() {
        if (this.config.replicas <= 0) return;

        for (const [nodeKey, masterClient] of this.nodes) {
            const [host, port] = nodeKey.split(':');
            const masterPort = parseInt(port);
            
            // Create replica connections
            for (let i = 1; i <= this.config.replicas; i++) {
                const replicaPort = masterPort + (i * 1000); // Simple port offset strategy
                
                try {
                    const replicaClient = Redis.createClient({
                        socket: {
                            host,
                            port: replicaPort,
                            connectTimeout: this.config.connectionTimeout
                        }
                    });

                    await replicaClient.connect();
                    
                    // Configure replication
                    await replicaClient.configSet('replicaof', `${host} ${masterPort}`);
                    
                    this.nodes.set(`${host}:${replicaPort}`, replicaClient);
                    this.connectionPool.set(`${host}:${replicaPort}`, {
                        client: replicaClient,
                        lastUsed: Date.now(),
                        activeConnections: 0,
                        isReplica: true
                    });
                    
                } catch (error) {
                    console.warn(`Failed to setup replica on ${host}:${replicaPort}:`, error.message);
                }
            }
        }
    }

    getNodeForKey(key) {
        const slot = this.getSlot(key);
        return this.slots[slot];
    }

    getSlot(key) {
        if (this.config.keyDistribution === 'crc16') {
            return this.crc16(key) % 16384;
        } else if (this.config.keyDistribution === 'hash') {
            let hash = 0;
            for (let i = 0; i < key.length; i++) {
                const char = key.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash) % 16384;
        }
        return Math.floor(Math.random() * 16384);
    }

    crc16(str) {
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
            }
        }
        return crc & 0xFFFF;
    }

    async executeCommand(command, ...args) {
        const startTime = Date.now();
        this.metrics.commands++;

        try {
            const key = args[0];
            const nodeKey = this.getNodeForKey(key);
            const connection = this.connectionPool.get(nodeKey);
            
            if (!connection) {
                throw new Error(`No connection found for node: ${nodeKey}`);
            }

            connection.activeConnections++;
            connection.lastUsed = Date.now();

            const result = await connection.client[command](...args);
            
            connection.activeConnections--;
            this.metrics.hits++;
            
            const latency = Date.now() - startTime;
            this.metrics.latency.push(latency);
            
            // Keep only last 1000 latency measurements
            if (this.metrics.latency.length > 1000) {
                this.metrics.latency = this.metrics.latency.slice(-1000);
            }

            return result;

        } catch (error) {
            this.metrics.errors++;
            this.metrics.misses++;
            throw error;
        }
    }

    // Redis commands implementation
    async get(key) {
        return this.executeCommand('get', key);
    }

    async set(key, value, options = {}) {
        const args = [key, value];
        if (options.ex) {
            args.push('EX', options.ex);
        }
        if (options.px) {
            args.push('PX', options.px);
        }
        return this.executeCommand('set', ...args);
    }

    async del(key) {
        return this.executeCommand('del', key);
    }

    async exists(key) {
        return this.executeCommand('exists', key);
    }

    async expire(key, seconds) {
        return this.executeCommand('expire', key, seconds);
    }

    async ttl(key) {
        return this.executeCommand('ttl', key);
    }

    async hget(key, field) {
        return this.executeCommand('hget', key, field);
    }

    async hset(key, field, value) {
        return this.executeCommand('hset', key, field, value);
    }

    async hdel(key, field) {
        return this.executeCommand('hdel', key, field);
    }

    async hgetall(key) {
        return this.executeCommand('hgetall', key);
    }

    async sadd(key, ...members) {
        return this.executeCommand('sadd', key, ...members);
    }

    async srem(key, ...members) {
        return this.executeCommand('srem', key, ...members);
    }

    async smembers(key) {
        return this.executeCommand('smembers', key);
    }

    async sismember(key, member) {
        return this.executeCommand('sismember', key, member);
    }

    async lpush(key, ...elements) {
        return this.executeCommand('lpush', key, ...elements);
    }

    async rpush(key, ...elements) {
        return this.executeCommand('rpush', key, ...elements);
    }

    async lpop(key) {
        return this.executeCommand('lpop', key);
    }

    async rpop(key) {
        return this.executeCommand('rpop', key);
    }

    async lrange(key, start, stop) {
        return this.executeCommand('lrange', key, start, stop);
    }

    async incr(key) {
        return this.executeCommand('incr', key);
    }

    async incrby(key, increment) {
        return this.executeCommand('incrby', key, increment);
    }

    async flushall() {
        const promises = [];
        for (const [nodeKey, connection] of this.connectionPool) {
            if (!connection.isReplica) {
                promises.push(connection.client.flushall());
            }
        }
        await Promise.all(promises);
    }

    // Cluster management methods
    async addNode(nodeConfig) {
        const client = Redis.createClient({
            socket: {
                host: nodeConfig.host,
                port: nodeConfig.port,
                connectTimeout: this.config.connectionTimeout
            }
        });

        await client.connect();
        const nodeKey = `${nodeConfig.host}:${nodeConfig.port}`;
        this.nodes.set(nodeKey, client);
        this.connectionPool.set(nodeKey, {
            client,
            lastUsed: Date.now(),
            activeConnections: 0
        });

        await this.setupSlotMapping();
        this.emit('nodeAdded', nodeConfig);
    }

    async removeNode(nodeConfig) {
        const nodeKey = `${nodeConfig.host}:${nodeConfig.port}`;
        const connection = this.connectionPool.get(nodeKey);
        
        if (connection) {
            await connection.client.quit();
            this.connectionPool.delete(nodeKey);
            this.nodes.delete(nodeKey);
            await this.setupSlotMapping();
            this.emit('nodeRemoved', nodeConfig);
        }
    }

    // Health check
    async healthCheck() {
        const results = [];
        
        for (const [nodeKey, connection] of this.connectionPool) {
            try {
                const startTime = Date.now();
                await connection.client.ping();
                const latency = Date.now() - startTime;
                
                results.push({
                    node: nodeKey,
                    status: 'healthy',
                    latency,
                    activeConnections: connection.activeConnections,
                    isReplica: connection.isReplica || false
                });
            } catch (error) {
                results.push({
                    node: nodeKey,
                    status: 'unhealthy',
                    error: error.message,
                    activeConnections: connection.activeConnections,
                    isReplica: connection.isReplica || false
                });
            }
        }
        
        return results;
    }

    // Metrics and monitoring
    getMetrics() {
        const avgLatency = this.metrics.latency.length > 0 
            ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length 
            : 0;

        return {
            ...this.metrics,
            hitRate: this.metrics.commands > 0 ? (this.metrics.hits / this.metrics.commands) * 100 : 0,
            errorRate: this.metrics.commands > 0 ? (this.metrics.errors / this.metrics.commands) * 100 : 0,
            avgLatency,
            totalNodes: this.nodes.size,
            activeConnections: Array.from(this.connectionPool.values())
                .reduce((sum, conn) => sum + conn.activeConnections, 0)
        };
    }

    // Graceful shutdown
    async disconnect() {
        const promises = [];
        for (const [nodeKey, connection] of this.connectionPool) {
            promises.push(connection.client.quit());
        }
        await Promise.all(promises);
        this.isReady = false;
    }
}

module.exports = RedisCluster;
