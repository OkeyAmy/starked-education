import { bciService, CognitiveState, BCIDevice } from './bciService';
import { signalProcessor } from './signalProcessor';
import { mlModel } from './mlModel';
import { adaptiveContentEngine } from './adaptiveContentEngine';

describe('BCI Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Device Management', () => {
    test('should return available BCI devices', async () => {
      const devices = await bciService.getAvailableDevices();
      
      expect(devices).toHaveLength(3);
      expect(devices[0]).toHaveProperty('id');
      expect(devices[0]).toHaveProperty('name');
      expect(devices[0]).toHaveProperty('type');
      expect(devices[0]).toHaveProperty('connected');
    });

    test('should handle device connection', async () => {
      const success = await bciService.connectDevice('muse2');
      
      expect(typeof success).toBe('boolean');
    });

    test('should handle device disconnection', async () => {
      await bciService.disconnectDevice();
      expect(bciService.isDeviceConnected()).toBe(false);
    });
  });

  describe('Cognitive State Analysis', () => {
    test('should analyze cognitive state from brain signals', () => {
      const mockSignals = [
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
        [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]
      ];

      const cognitiveState = bciService.getCurrentCognitiveState();
      
      if (cognitiveState) {
        expect(cognitiveState).toHaveProperty('attention');
        expect(cognitiveState).toHaveProperty('relaxation');
        expect(cognitiveState).toHaveProperty('engagement');
        expect(cognitiveState).toHaveProperty('cognitiveLoad');
        expect(cognitiveState).toHaveProperty('timestamp');
        
        expect(cognitiveState.attention).toBeGreaterThanOrEqual(0);
        expect(cognitiveState.attention).toBeLessThanOrEqual(1);
      }
    });

    test('should detect navigation intent', async () => {
      const intent = await bciService.detectNavigationIntent();
      
      expect(intent === null || typeof intent === 'string').toBe(true);
    });
  });

  describe('Signal Processing', () => {
    test('should apply FFT to signals', () => {
      const signal = Array.from({ length: 256 }, (_, i) => Math.sin(i * 0.1));
      const frequencies = signalProcessor.applyFFT(signal);
      
      expect(frequencies).toHaveLength(128);
      expect(frequencies.every(val => typeof val === 'number')).toBe(true);
    });

    test('should extract frequency bands', () => {
      const signal = Array.from({ length: 256 }, (_, i) => Math.sin(i * 0.1));
      const bands = signalProcessor.extractFrequencyBands(signal);
      
      expect(bands).toHaveProperty('delta');
      expect(bands).toHaveProperty('theta');
      expect(bands).toHaveProperty('alpha');
      expect(bands).toHaveProperty('beta');
      expect(bands).toHaveProperty('gamma');
    });

    test('should calculate signal entropy', () => {
      const signal = Array.from({ length: 100 }, () => Math.random());
      const entropy = signalProcessor.calculateEntropy(signal);
      
      expect(typeof entropy).toBe('number');
      expect(entropy).toBeGreaterThanOrEqual(0);
    });

    test('should detect artifacts', () => {
      const cleanSignal = Array.from({ length: 100 }, () => Math.random() * 0.5);
      const artifactSignal = [...cleanSignal, 100, -100];
      
      const cleanDetection = signalProcessor.detectArtifacts(cleanSignal);
      const artifactDetection = signalProcessor.detectArtifacts(artifactSignal);
      
      expect(cleanDetection.hasArtifacts).toBe(false);
      expect(artifactDetection.hasArtifacts).toBe(true);
    });
  });

  describe('Machine Learning Model', () => {
    test('should initialize ML model', () => {
      expect(mlModel).toBeDefined();
    });

    test('should extract features from signals', () => {
      const mockSignals = [
        {
          timestamp: Date.now(),
          channels: [[0.1, 0.2, 0.3, 0.4, 0.5]],
          frequency: 256
        }
      ];
      const mockHistory = [
        {
          attention: 0.7,
          relaxation: 0.5,
          engagement: 0.6,
          cognitiveLoad: 0.4,
          timestamp: Date.now()
        }
      ];

      const features = mlModel.extractFeatures(mockSignals, mockHistory);
      
      expect(features).toHaveLength(32);
      expect(features.every(val => typeof val === 'number')).toBe(true);
    });

    test('should make predictions', async () => {
      const features = Array.from({ length: 32 }, () => Math.random());
      const prediction = await mlModel.predict(features);
      
      expect(prediction).toHaveProperty('attention');
      expect(prediction).toHaveProperty('relaxation');
      expect(prediction).toHaveProperty('engagement');
      expect(prediction).toHaveProperty('cognitiveLoad');
      expect(prediction).toHaveProperty('confidence');
      
      expect(prediction.attention).toBeGreaterThanOrEqual(0);
      expect(prediction.attention).toBeLessThanOrEqual(1);
    });

    test('should generate synthetic training data', () => {
      const trainingData = mlModel.generateSyntheticTrainingData(100);
      
      expect(trainingData).toHaveProperty('features');
      expect(trainingData).toHaveProperty('labels');
      expect(trainingData.features).toHaveLength(100);
      expect(trainingData.labels).toHaveLength(100);
      expect(trainingData.features[0]).toHaveLength(32);
      expect(trainingData.labels[0]).toHaveLength(4);
    });
  });

  describe('Adaptive Content Engine', () => {
    test('should initialize content library', () => {
      const paths = adaptiveContentEngine.getAllLearningPaths();
      expect(paths.length).toBeGreaterThan(0);
    });

    test('should start learning session', () => {
      const sessionId = adaptiveContentEngine.startLearningSession('beginner_path', 'test-user');
      expect(typeof sessionId).toBe('string');
    });

    test('should get next content', () => {
      const sessionId = adaptiveContentEngine.startLearningSession('beginner_path', 'test-user');
      const mockCognitiveState: CognitiveState = {
        attention: 0.7,
        relaxation: 0.5,
        engagement: 0.6,
        cognitiveLoad: 0.4,
        timestamp: Date.now()
      };
      
      const content = adaptiveContentEngine.getNextContent(sessionId, mockCognitiveState);
      
      if (content) {
        expect(content).toHaveProperty('id');
        expect(content).toHaveProperty('type');
        expect(content).toHaveProperty('title');
        expect(content).toHaveProperty('difficulty');
      }
    });

    test('should complete content', () => {
      const sessionId = adaptiveContentEngine.startLearningSession('beginner_path', 'test-user');
      adaptiveContentEngine.completeContent(sessionId, 'intro_basics', { accuracy: 0.8, timeSpent: 300 });
      
      const progress = adaptiveContentEngine.getSessionProgress(sessionId);
      expect(progress).not.toBeNull();
      expect(progress!.completed).toBe(1);
    });

    test('should provide recommendations', () => {
      const sessionId = adaptiveContentEngine.startLearningSession('beginner_path', 'test-user');
      const recommendations = adaptiveContentEngine.getRecommendations(sessionId);
      
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should calculate learning analytics', () => {
      const sessionId = adaptiveContentEngine.startLearningSession('beginner_path', 'test-user');
      const analytics = adaptiveContentEngine.getLearningAnalytics(sessionId);
      
      if (analytics) {
        expect(analytics).toHaveProperty('totalSessionTime');
        expect(analytics).toHaveProperty('averageEngagement');
        expect(analytics).toHaveProperty('averageCognitiveLoad');
        expect(analytics).toHaveProperty('adaptationFrequency');
        expect(analytics).toHaveProperty('learningEfficiency');
      }
    });
  });
});

describe('BCI Performance Tests', () => {
  test('signal processing should complete within time limit', () => {
    const start = performance.now();
    
    const signal = Array.from({ length: 256 }, (_, i) => Math.sin(i * 0.1));
    signalProcessor.applyFFT(signal);
    signalProcessor.extractFrequencyBands(signal);
    signalProcessor.calculateEntropy(signal);
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(100); // Should complete in less than 100ms
  });

  test('ML prediction should complete within time limit', async () => {
    const start = performance.now();
    
    const features = Array.from({ length: 32 }, () => Math.random());
    await mlModel.predict(features);
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
  });

  test('content adaptation should complete within time limit', () => {
    const start = performance.now();
    
    const sessionId = adaptiveContentEngine.startLearningSession('beginner_path', 'test-user');
    const mockCognitiveState: CognitiveState = {
      attention: 0.7,
      relaxation: 0.5,
      engagement: 0.6,
      cognitiveLoad: 0.4,
      timestamp: Date.now()
    };
    
    adaptiveContentEngine.getNextContent(sessionId, mockCognitiveState);
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(50); // Should complete in less than 50ms
  });
});

describe('BCI Integration Tests', () => {
  test('full BCI pipeline should work end-to-end', async () => {
    // 1. Connect device
    const devices = await bciService.getAvailableDevices();
    expect(devices.length).toBeGreaterThan(0);
    
    // 2. Process signals
    const signal = Array.from({ length: 256 }, (_, i) => Math.sin(i * 0.1));
    const frequencies = signalProcessor.applyFFT(signal);
    expect(frequencies.length).toBeGreaterThan(0);
    
    // 3. Extract features and predict
    const features = mlModel.extractFeatures(
      [{
        timestamp: Date.now(),
        channels: [signal.slice(0, 8)],
        frequency: 256
      }],
      [{
        attention: 0.7,
        relaxation: 0.5,
        engagement: 0.6,
        cognitiveLoad: 0.4,
        timestamp: Date.now()
      }]
    );
    
    const prediction = await mlModel.predict(features);
    expect(prediction).toBeDefined();
    
    // 4. Adapt content
    const sessionId = adaptiveContentEngine.startLearningSession('beginner_path', 'test-user');
    const content = adaptiveContentEngine.getNextContent(sessionId, {
      attention: prediction.attention,
      relaxation: prediction.relaxation,
      engagement: prediction.engagement,
      cognitiveLoad: prediction.cognitiveLoad,
      timestamp: Date.now()
    });
    
    expect(content).toBeDefined();
  });
});

describe('BCI Error Handling', () => {
  test('should handle invalid device ID gracefully', async () => {
    const success = await bciService.connectDevice('invalid_device');
    expect(success).toBe(false);
  });

  test('should handle empty signals gracefully', () => {
    const frequencies = signalProcessor.applyFFT([]);
    expect(frequencies).toHaveLength(0);
  });

  test('should handle invalid features gracefully', async () => {
    const prediction = await mlModel.predict([]);
    expect(prediction).toBeDefined();
    expect(prediction.confidence).toBe(0);
  });

  test('should handle invalid session ID gracefully', () => {
    const progress = adaptiveContentEngine.getSessionProgress('invalid_session');
    expect(progress).toBeNull();
  });
});
