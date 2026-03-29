/**
 * Edge Computing Service
 * Content processing at the edge for reduced latency and improved performance
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger';

export interface EdgeNode {
  id: string;
  name: string;
  location: {
    country: string;
    region: string;
    city: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  endpoint: string;
  capabilities: EdgeCapabilities;
  status: 'active' | 'inactive' | 'maintenance';
  load: NodeLoad;
  health: NodeHealth;
  lastHeartbeat: Date;
}

export interface EdgeCapabilities {
  supportedFormats: string[];
  maxFileSize: number; // in MB
  maxConcurrentJobs: number;
  processingPower: 'low' | 'medium' | 'high';
  storageCapacity: number; // in GB
  availableStorage: number; // in GB
  supportedOperations: EdgeOperation[];
}

export interface EdgeOperation {
  type: 'transcode' | 'compress' | 'resize' | 'watermark' | 'thumbnail' | 'analyze';
  supportedFormats: string[];
  maxResolution?: string;
  costPerOperation: number;
}

export interface NodeLoad {
  cpu: number; // percentage 0-100
  memory: number; // percentage 0-100
  storage: number; // percentage 0-100
  network: number; // percentage 0-100
  activeJobs: number;
  queueLength: number;
}

export interface NodeHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number; // in ms
  errorRate: number; // percentage 0-100
  lastError?: Date;
  uptime: number; // percentage 0-100
}

export interface EdgeJob {
  id: string;
  type: EdgeOperation['type'];
  inputUrl: string;
  outputUrl?: string;
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedNode?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: number; // percentage 0-100
  result?: EdgeJobResult;
  error?: string;
}

export interface EdgeJobResult {
  outputUrl: string;
  fileSize: number;
  processingTime: number;
  nodeUsed: string;
  metrics: ProcessingMetrics;
}

export interface ProcessingMetrics {
  cpuTime: number;
  memoryPeak: number;
  networkBytes: number;
  storageUsed: number;
  operationsCount: number;
}

export interface ContentProcessingRequest {
  contentId: string;
  operations: ProcessingOperation[];
  clientLocation: {
    country: string;
    region: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: Date;
  maxCost?: number;
}

export interface ProcessingOperation {
  type: EdgeOperation['type'];
  parameters: Record<string, any>;
  outputFormat?: string;
}

export class EdgeComputingService {
  private eventEmitter: EventEmitter = new EventEmitter();
  private edgeNodes: Map<string, EdgeNode> = new Map();
  private activeJobs: Map<string, EdgeJob> = new Map();
  private jobQueue: EdgeJob[] = [];
  private processingStrategies: Map<string, ProcessingStrategy> = new Map();
  private healthCheckInterval?: any;

  constructor() {
    this.initializeEdgeNodes();
    this.initializeProcessingStrategies();
    this.startHealthMonitoring();
    this.startJobProcessing();
  }

  /**
   * Initialize edge nodes with their capabilities
   */
  private initializeEdgeNodes(): void {
    const nodes: EdgeNode[] = [
      {
        id: 'edge-na-east-1',
        name: 'North America East - Edge Node 1',
        location: {
          country: 'US',
          region: 'East Coast',
          city: 'New York',
          coordinates: { latitude: 40.7128, longitude: -74.0060 }
        },
        endpoint: 'https://edge-na-east-1.starked-education.com',
        capabilities: {
          supportedFormats: ['mp4', 'webm', 'jpg', 'png', 'webp', 'avif'],
          maxFileSize: 500,
          maxConcurrentJobs: 10,
          processingPower: 'high',
          storageCapacity: 1000,
          availableStorage: 750,
          supportedOperations: [
            {
              type: 'transcode',
              supportedFormats: ['mp4', 'webm'],
              maxResolution: '4k',
              costPerOperation: 0.05
            },
            {
              type: 'compress',
              supportedFormats: ['jpg', 'png', 'webp'],
              costPerOperation: 0.01
            },
            {
              type: 'thumbnail',
              supportedFormats: ['mp4', 'jpg', 'png'],
              costPerOperation: 0.005
            }
          ]
        },
        status: 'active',
        load: {
          cpu: 30,
          memory: 40,
          storage: 25,
          network: 20,
          activeJobs: 3,
          queueLength: 2
        },
        health: {
          status: 'healthy',
          responseTime: 45,
          errorRate: 0.1,
          uptime: 99.9
        },
        lastHeartbeat: new Date()
      },
      {
        id: 'edge-eu-west-1',
        name: 'Europe West - Edge Node 1',
        location: {
          country: 'UK',
          region: 'Western Europe',
          city: 'London',
          coordinates: { latitude: 51.5074, longitude: -0.1278 }
        },
        endpoint: 'https://edge-eu-west-1.starked-education.com',
        capabilities: {
          supportedFormats: ['mp4', 'webm', 'jpg', 'png', 'webp'],
          maxFileSize: 300,
          maxConcurrentJobs: 8,
          processingPower: 'medium',
          storageCapacity: 800,
          availableStorage: 600,
          supportedOperations: [
            {
              type: 'transcode',
              supportedFormats: ['mp4', 'webm'],
              maxResolution: '1080p',
              costPerOperation: 0.04
            },
            {
              type: 'compress',
              supportedFormats: ['jpg', 'png', 'webp'],
              costPerOperation: 0.008
            },
            {
              type: 'resize',
              supportedFormats: ['jpg', 'png'],
              costPerOperation: 0.003
            }
          ]
        },
        status: 'active',
        load: {
          cpu: 45,
          memory: 55,
          storage: 35,
          network: 30,
          activeJobs: 5,
          queueLength: 4
        },
        health: {
          status: 'healthy',
          responseTime: 60,
          errorRate: 0.2,
          uptime: 99.5
        },
        lastHeartbeat: new Date()
      },
      {
        id: 'edge-asia-east-1',
        name: 'Asia East - Edge Node 1',
        location: {
          country: 'Singapore',
          region: 'Southeast Asia',
          city: 'Singapore',
          coordinates: { latitude: 1.3521, longitude: 103.8198 }
        },
        endpoint: 'https://edge-asia-east-1.starked-education.com',
        capabilities: {
          supportedFormats: ['mp4', 'webm', 'jpg', 'png'],
          maxFileSize: 200,
          maxConcurrentJobs: 6,
          processingPower: 'medium',
          storageCapacity: 600,
          availableStorage: 450,
          supportedOperations: [
            {
              type: 'transcode',
              supportedFormats: ['mp4', 'webm'],
              maxResolution: '720p',
              costPerOperation: 0.03
            },
            {
              type: 'compress',
              supportedFormats: ['jpg', 'png'],
              costPerOperation: 0.006
            }
          ]
        },
        status: 'active',
        load: {
          cpu: 25,
          memory: 35,
          storage: 20,
          network: 25,
          activeJobs: 2,
          queueLength: 1
        },
        health: {
          status: 'healthy',
          responseTime: 55,
          errorRate: 0.15,
          uptime: 99.7
        },
        lastHeartbeat: new Date()
      }
    ];

    nodes.forEach(node => {
      this.edgeNodes.set(node.id, node);
    });

    logger.info(`Initialized ${nodes.length} edge nodes`);
  }

  /**
   * Initialize processing strategies
   */
  private initializeProcessingStrategies(): void {
    const strategies: ProcessingStrategy[] = [
      {
        id: 'proximity-first',
        name: 'Proximity First Strategy',
        description: 'Prioritize nearest edge nodes for lowest latency',
        priority: 1,
        isActive: true,
        nodeSelector: this.selectProximityNode.bind(this)
      },
      {
        id: 'load-balanced',
        name: 'Load Balanced Strategy',
        description: 'Distribute jobs across nodes based on current load',
        priority: 2,
        isActive: true,
        nodeSelector: this.selectLoadBalancedNode.bind(this)
      },
      {
        id: 'cost-optimized',
        name: 'Cost Optimized Strategy',
        description: 'Select nodes with lowest processing cost',
        priority: 3,
        isActive: true,
        nodeSelector: this.selectCostOptimizedNode.bind(this)
      },
      {
        id: 'capability-matched',
        name: 'Capability Matched Strategy',
        description: 'Select nodes best suited for specific operations',
        priority: 4,
        isActive: true,
        nodeSelector: this.selectCapabilityMatchedNode.bind(this)
      }
    ];

    strategies.forEach(strategy => {
      this.processingStrategies.set(strategy.id, strategy);
    });

    logger.info(`Initialized ${strategies.length} processing strategies`);
  }

  /**
   * Process content at the edge
   */
  async processContentAtEdge(request: ContentProcessingRequest): Promise<EdgeJob[]> {
    try {
      logger.info(`Processing content ${request.contentId} at edge with ${request.operations.length} operations`);

      const jobs: EdgeJob[] = [];

      // Create jobs for each operation
      for (const operation of request.operations) {
        const job = await this.createEdgeJob(request.contentId, operation, request);
        jobs.push(job);
      }

      // Add jobs to queue
      this.jobQueue.push(...jobs);
      this.activeJobs.forEach((job, id) => {
        if (job.status === 'pending') {
          this.activeJobs.set(id, job);
        }
      });

      logger.info(`Created ${jobs.length} edge jobs for content ${request.contentId}`);
      this.eventEmitter.emit('edge:jobs:created', { contentId: request.contentId, jobs });

      return jobs;
    } catch (error) {
      logger.error('Error processing content at edge:', error);
      throw error;
    }
  }

  /**
   * Create edge job
   */
  private async createEdgeJob(
    contentId: string,
    operation: ProcessingOperation,
    request: ContentProcessingRequest
  ): Promise<EdgeJob> {
    const job: EdgeJob = {
      id: this.generateJobId(),
      type: operation.type,
      inputUrl: `https://cdn.starked-education.com/content/${contentId}`,
      parameters: operation.parameters,
      priority: request.priority,
      status: 'pending',
      createdAt: new Date(),
      progress: 0
    };

    this.activeJobs.set(job.id, job);
    return job;
  }

  /**
   * Start job processing loop
   */
  private startJobProcessing(): void {
    setInterval(() => {
      this.processJobQueue();
    }, 5000); // Process queue every 5 seconds

    logger.info('Started edge job processing');
  }

  /**
   * Process job queue
   */
  private async processJobQueue(): Promise<void> {
    try {
      const pendingJobs = this.jobQueue.filter(job => job.status === 'pending');
      
      if (pendingJobs.length === 0) {
        return;
      }

      // Sort by priority
      pendingJobs.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Process jobs
      for (const job of pendingJobs.slice(0, 5)) { // Process up to 5 jobs per cycle
        await this.assignAndExecuteJob(job);
      }
    } catch (error) {
      logger.error('Error processing job queue:', error);
    }
  }

  /**
   * Assign and execute job on optimal edge node
   */
  private async assignAndExecuteJob(job: EdgeJob): Promise<void> {
    try {
      // Select optimal node
      const node = await this.selectOptimalNode(job);
      
      if (!node) {
        logger.warn(`No suitable edge node found for job ${job.id}`);
        return;
      }

      // Assign job to node
      job.assignedNode = node.id;
      job.status = 'processing';
      job.startedAt = new Date();

      // Update node load
      node.load.activeJobs++;
      node.load.queueLength--;

      logger.info(`Assigned job ${job.id} to edge node ${node.id}`);
      this.eventEmitter.emit('edge:job:assigned', { job, node });

      // Execute job (simulated)
      await this.executeJobOnNode(job, node);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to execute job ${job.id}:`, error);
      this.eventEmitter.emit('edge:job:failed', job);
    }
  }

  /**
   * Select optimal edge node for job
   */
  private async selectOptimalNode(job: EdgeJob): Promise<EdgeNode | null> {
    const activeStrategies = Array.from(this.processingStrategies.values())
      .filter(strategy => strategy.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of activeStrategies) {
      try {
        const node = await strategy.nodeSelector(job);
        if (node) {
          return node;
        }
      } catch (error) {
        logger.warn(`Strategy ${strategy.id} failed:`, error);
      }
    }

    return null;
  }

  /**
   * Select node based on proximity (geographic distance)
   */
  private async selectProximityNode(job: EdgeJob): Promise<EdgeNode | null> {
    // In a real implementation, would calculate actual distance
    // For now, return a random healthy node
    const healthyNodes = Array.from(this.edgeNodes.values())
      .filter(node => node.status === 'active' && node.health.status === 'healthy')
      .filter(node => node.load.activeJobs < node.capabilities.maxConcurrentJobs);

    return healthyNodes.length > 0 ? healthyNodes[0] : null;
  }

  /**
   * Select node based on load balancing
   */
  private async selectLoadBalancedNode(job: EdgeJob): Promise<EdgeNode | null> {
    const availableNodes = Array.from(this.edgeNodes.values())
      .filter(node => node.status === 'active' && node.health.status === 'healthy')
      .filter(node => node.load.activeJobs < node.capabilities.maxConcurrentJobs);

    if (availableNodes.length === 0) return null;

    // Select node with lowest load
    return availableNodes.reduce((best, current) => {
      const bestLoad = best.load.cpu + best.load.memory + best.load.network;
      const currentLoad = current.load.cpu + current.load.memory + current.load.network;
      return currentLoad < bestLoad ? current : best;
    });
  }

  /**
   * Select node based on cost optimization
   */
  private async selectCostOptimizedNode(job: EdgeJob): Promise<EdgeNode | null> {
    const availableNodes = Array.from(this.edgeNodes.values())
      .filter(node => node.status === 'active' && node.health.status === 'healthy')
      .filter(node => node.load.activeJobs < node.capabilities.maxConcurrentJobs);

    if (availableNodes.length === 0) return null;

    // Find node with lowest cost for this operation type
    const operationCosts = availableNodes.map(node => {
      const operation = node.capabilities.supportedOperations.find(op => op.type === job.type);
      return {
        node,
        cost: operation?.costPerOperation || Infinity
      };
    });

    const cheapest = operationCosts.sort((a, b) => a.cost - b.cost)[0];
    return cheapest.cost !== Infinity ? cheapest.node : null;
  }

  /**
   * Select node based on capability matching
   */
  private async selectCapabilityMatchedNode(job: EdgeJob): Promise<EdgeNode | null> {
    const availableNodes = Array.from(this.edgeNodes.values())
      .filter(node => node.status === 'active' && node.health.status === 'healthy')
      .filter(node => node.load.activeJobs < node.capabilities.maxConcurrentJobs)
      .filter(node => node.capabilities.supportedOperations.some(op => op.type === job.type));

    if (availableNodes.length === 0) return null;

    // Select node with highest processing power for this operation
    return availableNodes.reduce((best, current) => {
      const bestPower = this.getProcessingPowerScore(best, job.type);
      const currentPower = this.getProcessingPowerScore(current, job.type);
      return currentPower > bestPower ? current : best;
    });
  }

  /**
   * Get processing power score for node and operation
   */
  private getProcessingPowerScore(node: EdgeNode, operationType: string): number {
    const operation = node.capabilities.supportedOperations.find(op => op.type === operationType);
    if (!operation) return 0;

    let score = 0;

    // Processing power
    switch (node.capabilities.processingPower) {
      case 'high': score += 100; break;
      case 'medium': score += 70; break;
      case 'low': score += 40; break;
    }

    // Available capacity
    const capacityRatio = (node.capabilities.maxConcurrentJobs - node.load.activeJobs) / node.capabilities.maxConcurrentJobs;
    score += capacityRatio * 50;

    // Health status
    switch (node.health.status) {
      case 'healthy': score += 30; break;
      case 'degraded': score += 10; break;
      case 'unhealthy': score -= 50; break;
    }

    return score;
  }

  /**
   * Execute job on edge node (simulated)
   */
  private async executeJobOnNode(job: EdgeJob, node: EdgeNode): Promise<void> {
    try {
      // Simulate processing time based on operation type and node power
      const baseTime = this.getBaseProcessingTime(job.type);
      const powerMultiplier = this.getPowerMultiplier(node.capabilities.processingPower);
      const processingTime = baseTime * powerMultiplier;

      // Update progress
      const progressInterval = setInterval(() => {
        job.progress = Math.min(100, job.progress + 10);
        this.eventEmitter.emit('edge:job:progress', job);
      }, processingTime / 10);

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, processingTime));

      clearInterval(progressInterval);

      // Complete job
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      job.result = {
        outputUrl: `https://edge-${node.id}.starked-education.com/output/${job.id}`,
        fileSize: Math.floor(Math.random() * 10000000), // Random file size
        processingTime,
        nodeUsed: node.id,
        metrics: {
          cpuTime: processingTime * 0.8,
          memoryPeak: 512,
          networkBytes: job.result?.fileSize || 0,
          storageUsed: job.result?.fileSize || 0,
          operationsCount: 1
        }
      };

      // Update node load
      node.load.activeJobs--;

      logger.info(`Completed job ${job.id} on node ${node.id}`);
      this.eventEmitter.emit('edge:job:completed', job);

      // Remove from queue
      const queueIndex = this.jobQueue.findIndex(j => j.id === job.id);
      if (queueIndex !== -1) {
        this.jobQueue.splice(queueIndex, 1);
      }
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      node.load.activeJobs--;
      throw error;
    }
  }

  /**
   * Get base processing time for operation type
   */
  private getBaseProcessingTime(operationType: string): number {
    switch (operationType) {
      case 'transcode': return 10000; // 10 seconds
      case 'compress': return 3000; // 3 seconds
      case 'resize': return 2000; // 2 seconds
      case 'thumbnail': return 1500; // 1.5 seconds
      case 'watermark': return 4000; // 4 seconds
      case 'analyze': return 5000; // 5 seconds
      default: return 3000;
    }
  }

  /**
   * Get power multiplier based on processing power
   */
  private getPowerMultiplier(power: string): number {
    switch (power) {
      case 'high': return 0.5;
      case 'medium': return 1;
      case 'low': return 2;
      default: return 1;
    }
  }

  /**
   * Start health monitoring for edge nodes
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Every 30 seconds

    logger.info('Started edge node health monitoring');
  }

  /**
   * Perform health checks on all edge nodes
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.edgeNodes.values()).map(node => 
      this.checkNodeHealth(node)
    );

    await Promise.allSettled(healthPromises);
  }

  /**
   * Check individual node health
   */
  private async checkNodeHealth(node: EdgeNode): Promise<void> {
    try {
      // Simulate health check
      const responseTime = 30 + Math.random() * 100; // 30-130ms
      const errorRate = Math.random() * 2; // 0-2%
      const uptime = 95 + Math.random() * 5; // 95-100%

      // Update node health
      node.health.responseTime = responseTime;
      node.health.errorRate = errorRate;
      node.health.uptime = uptime;
      
      if (errorRate > 5 || responseTime > 500) {
        node.health.status = 'unhealthy';
      } else if (errorRate > 2 || responseTime > 200) {
        node.health.status = 'degraded';
      } else {
        node.health.status = 'healthy';
      }

      node.lastHeartbeat = new Date();

      // Update node load (simulated)
      node.load.cpu = Math.max(0, Math.min(100, node.load.cpu + (Math.random() - 0.5) * 10));
      node.load.memory = Math.max(0, Math.min(100, node.load.memory + (Math.random() - 0.5) * 10));
      node.load.network = Math.max(0, Math.min(100, node.load.network + (Math.random() - 0.5) * 10));

      this.eventEmitter.emit('edge:node:health', node);
    } catch (error) {
      node.health.status = 'unhealthy';
      node.lastError = new Date();
      logger.warn(`Health check failed for node ${node.id}:`, error);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `edge_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): EdgeJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get edge nodes
   */
  getEdgeNodes(): EdgeNode[] {
    return Array.from(this.edgeNodes.values());
  }

  /**
   * Get processing statistics
   */
  getProcessingStatistics(): {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
    nodeUtilization: Record<string, number>;
  } {
    const allJobs = Array.from(this.activeJobs.values());
    const completedJobs = allJobs.filter(job => job.status === 'completed');
    const failedJobs = allJobs.filter(job => job.status === 'failed');
    const activeJobs = allJobs.filter(job => job.status === 'processing');

    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => sum + (job.result?.processingTime || 0), 0) / completedJobs.length
      : 0;

    const nodeUtilization: Record<string, number> = {};
    this.edgeNodes.forEach((node, id) => {
      nodeUtilization[id] = node.load.activeJobs / node.capabilities.maxConcurrentJobs;
    });

    return {
      totalJobs: allJobs.length,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      averageProcessingTime,
      nodeUtilization
    };
  }

  /**
   * Cleanup and destroy service
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.eventEmitter.removeAllListeners();
    logger.info('Edge computing service destroyed');
  }
}

interface ProcessingStrategy {
  id: string;
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  nodeSelector: (job: EdgeJob) => Promise<EdgeNode | null>;
}
