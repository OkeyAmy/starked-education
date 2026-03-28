import holographicStorage from '../src/services/holographicStorage';

describe('Holographic Storage System', () => {
  beforeEach(() => {
    holographicStorage.clear();
  });

  describe('Encoding', () => {
    it('should encode data and return hash with spatial points', () => {
      const data = Buffer.from('Test educational content');
      const result = holographicStorage.encode(data, 'test-content-1');
      
      expect(result.hash).toBeDefined();
      expect(result.hash).toHaveLength(64);
      expect(result.points).toBeInstanceOf(Array);
      expect(result.points.length).toBeGreaterThan(0);
    });

    it('should generate valid 3D spatial points', () => {
      const data = Buffer.from('Course material data');
      const result = holographicStorage.encode(data, 'course-101');
      
      result.points.forEach(point => {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1);
        expect(point.z).toBeGreaterThanOrEqual(0);
        expect(point.z).toBeLessThanOrEqual(1);
        expect(point.phase).toBeGreaterThanOrEqual(0);
        expect(point.phase).toBeLessThanOrEqual(2 * Math.PI);
        expect(point.amplitude).toBeGreaterThanOrEqual(0);
        expect(point.amplitude).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Decoding', () => {
    it('should decode previously encoded data', () => {
      const original = Buffer.from('Educational video content');
      const { hash } = holographicStorage.encode(original, 'video-1');
      const decoded = holographicStorage.decode(hash);
      
      expect(decoded).toBeDefined();
      expect(decoded!.length).toBe(original.length);
    });

    it('should return null for non-existent hash', () => {
      const result = holographicStorage.decode('nonexistent-hash');
      expect(result).toBeNull();
    });
  });

  describe('Parallel Access', () => {
    it('should retrieve multiple items simultaneously', async () => {
      const data1 = Buffer.from('Content 1');
      const data2 = Buffer.from('Content 2');
      const data3 = Buffer.from('Content 3');
      
      const { hash: hash1 } = holographicStorage.encode(data1, 'c1');
      const { hash: hash2 } = holographicStorage.encode(data2, 'c2');
      const { hash: hash3 } = holographicStorage.encode(data3, 'c3');
      
      const results = await holographicStorage.parallelAccess([hash1, hash2, hash3]);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
    });
  });

  describe('Compression', () => {
    it('should compress data effectively', () => {
      const largeData = Buffer.alloc(1024, 'A');
      const { hash } = holographicStorage.encode(largeData, 'large-content');
      const metrics = holographicStorage.getMetrics();
      
      expect(metrics.compressionRatio).toBeGreaterThan(1);
    });
  });

  describe('Storage Metrics', () => {
    it('should calculate storage density', () => {
      const data = Buffer.from('Test data for metrics');
      holographicStorage.encode(data, 'metrics-test');
      
      const metrics = holographicStorage.getMetrics();
      
      expect(metrics.density).toBeGreaterThan(0);
      expect(metrics.accessSpeed).toBeGreaterThan(0);
      expect(metrics.compressionRatio).toBeGreaterThan(0);
    });

    it('should optimize storage density', () => {
      const data1 = Buffer.from('Content for optimization');
      const data2 = Buffer.from('More content for optimization');
      
      holographicStorage.encode(data1, 'opt-1');
      holographicStorage.encode(data2, 'opt-2');
      
      const optimized = holographicStorage.optimizeDensity();
      
      expect(optimized.density).toBeDefined();
      expect(optimized.accessSpeed).toBeDefined();
      expect(optimized.compressionRatio).toBeDefined();
    });
  });
});
