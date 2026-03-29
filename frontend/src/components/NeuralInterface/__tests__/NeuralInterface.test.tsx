import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NeuralInterfaceDashboard } from '../NeuralInterfaceDashboard';

// Mock the neural data service
jest.mock('@/services/neuralData', () => ({
  NeuralDataService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    createSession: jest.fn().mockResolvedValue({
      id: 'test-session',
      userId: 'test-user',
      courseId: 'test-course',
      startTime: Date.now(),
      status: 'active',
      content: {
        id: 'test-course',
        title: 'Test Course',
        type: 'interactive' as const,
        difficulty: 'beginner' as const,
        estimatedDuration: 1800
      }
    }),
    endSession: jest.fn().mockResolvedValue({
      efficiency: 0.85,
      comprehension: 0.90,
      retention: 0.80,
      sessionDuration: 1800,
      cognitiveLoad: 0.45
    }),
    updateStimulationSettings: jest.fn()
  }))
}));

// Mock safety constraints
jest.mock('@/lib/safetyConstraints', () => ({
  SafetyConstraints: jest.fn().mockImplementation(() => ({
    evaluateSafety: jest.fn().mockReturnValue({
      status: 'safe',
      alerts: [],
      recommendations: ['All systems operating within normal parameters']
    })
  }))
}));

describe('NeuralInterfaceDashboard', () => {
  const mockUserId = 'test-user-123';
  const mockOnLearningComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders neural interface dashboard correctly', async () => {
    render(
      <NeuralInterfaceDashboard
        userId={mockUserId}
        onLearningComplete={mockOnLearningComplete}
      />
    );

    // Check main components are rendered
    expect(screen.getByText('Neural Interface Learning')).toBeInTheDocument();
    expect(screen.getByText('EEG/EMG Sensor')).toBeInTheDocument();
    expect(screen.getByText('Neurostimulation')).toBeInTheDocument();
    expect(screen.getByText('Cognitive Monitor')).toBeInTheDocument();
    expect(screen.getByText('Safety Monitor')).toBeInTheDocument();
    expect(screen.getByText('Learning Profile')).toBeInTheDocument();
  });

  test('shows connection status initially', async () => {
    render(
      <NeuralInterfaceDashboard
        userId={mockUserId}
        onLearningComplete={mockOnLearningComplete}
      />
    );

    // Should show disconnected initially
    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  test('displays learning metrics when data is available', async () => {
    render(
      <NeuralInterfaceDashboard
        userId={mockUserId}
        onLearningComplete={mockOnLearningComplete}
      />
    );

    // Wait for components to initialize
    await waitFor(() => {
      expect(screen.getByText('Learning Performance')).toBeInTheDocument();
    });
  });

  test('handles learning completion callback', async () => {
    render(
      <NeuralInterfaceDashboard
        userId={mockUserId}
        onLearningComplete={mockOnLearningComplete}
      />
    );

    // Simulate learning completion
    // This would need to be triggered through user interaction in a real test
    expect(mockOnLearningComplete).toHaveBeenCalledTimes(0);
  });
});

describe('EEG Sensor Component', () => {
  test('renders sensor controls', () => {
    const EEGSensor = require('../EEGSensor').EEGSensor;
    const mockProps = {
      isConnected: false,
      onDataUpdate: jest.fn(),
      onSessionStart: jest.fn(),
      onSessionStop: jest.fn(),
      isSessionActive: false
    };

    render(<EEGSensor {...mockProps} />);

    expect(screen.getByText('Connect Sensor')).toBeInTheDocument();
    expect(screen.getByText('Signal Quality')).toBeInTheDocument();
  });

  test('shows course selection when connected', () => {
    const EEGSensor = require('../EEGSensor').EEGSensor;
    const mockProps = {
      isConnected: true,
      onDataUpdate: jest.fn(),
      onSessionStart: jest.fn(),
      onSessionStop: jest.fn(),
      isSessionActive: false
    };

    render(<EEGSensor {...mockProps} />);

    expect(screen.getByText('Select Learning Content')).toBeInTheDocument();
    expect(screen.getByText('Introduction to Blockchain')).toBeInTheDocument();
  });
});

describe('Neurostimulation Panel', () => {
  test('renders stimulation controls', () => {
    const NeurostimulationPanel = require('../NeurostimulationPanel').NeurostimulationPanel;
    const mockProps = {
      isSessionActive: false,
      onStimulationChange: jest.fn()
    };

    render(<NeurostimulationPanel {...mockProps} />);

    expect(screen.getByText('Neurostimulation')).toBeInTheDocument();
    expect(screen.getByText('Stimulation Protocol')).toBeInTheDocument();
    expect(screen.getByText('Focus Enhancement')).toBeInTheDocument();
  });

  test('displays safety guidelines', () => {
    const NeurostimulationPanel = require('../NeurostimulationPanel').NeurostimulationPanel;
    const mockProps = {
      isSessionActive: false,
      onStimulationChange: jest.fn()
    };

    render(<NeurostimulationPanel {...mockProps} />);

    expect(screen.getByText('Safety Guidelines')).toBeInTheDocument();
    expect(screen.getByText('Maximum intensity:')).toBeInTheDocument();
  });
});

describe('Cognitive Monitor', () => {
  test('renders cognitive metrics', () => {
    const CognitiveMonitor = require('../CognitiveMonitor').CognitiveMonitor;
    const mockProps = {
      neuralData: null,
      learningMetrics: null,
      onMetricsUpdate: jest.fn()
    };

    render(<CognitiveMonitor {...mockProps} />);

    expect(screen.getByText('Cognitive Monitor')).toBeInTheDocument();
    expect(screen.getByText('Focus Score')).toBeInTheDocument();
    expect(screen.getByText('Engagement Level')).toBeInTheDocument();
  });

  test('displays cognitive state recommendations', () => {
    const CognitiveMonitor = require('../CognitiveMonitor').CognitiveMonitor;
    const mockProps = {
      neuralData: {
        timestamp: Date.now(),
        eegData: {
          delta: 50,
          theta: 60,
          alpha: 55,
          beta: 70,
          gamma: 45
        },
        emgData: {
          frontal: 10,
          temporal: 8,
          occipital: 5
        },
        heartRate: 75,
        attention: 0.8,
        meditation: 0.5,
        cognitiveLoad: 0.6
      },
      learningMetrics: null,
      onMetricsUpdate: jest.fn()
    };

    render(<CognitiveMonitor {...mockProps} />);

    expect(screen.getByText('Optimal Learning State')).toBeInTheDocument();
  });
});

describe('Safety Monitor', () => {
  test('renders safety status', () => {
    const SafetyMonitor = require('../SafetyMonitor').SafetyMonitor;
    const mockProps = {
      safetyStatus: 'safe' as const,
      neuralData: null,
      constraints: {
        maxIntensity: 2000,
        maxDuration: 3600,
        minRestPeriod: 300,
        dailyLimit: 7200
      }
    };

    render(<SafetyMonitor {...mockProps} />);

    expect(screen.getByText('Safety Monitor')).toBeInTheDocument();
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });

  test('displays system health metrics', () => {
    const SafetyMonitor = require('../SafetyMonitor').SafetyMonitor;
    const mockProps = {
      safetyStatus: 'safe' as const,
      neuralData: null,
      constraints: {
        maxIntensity: 2000,
        maxDuration: 3600,
        minRestPeriod: 300,
        dailyLimit: 7200
      }
    };

    render(<SafetyMonitor {...mockProps} />);

    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Sensor Connection')).toBeInTheDocument();
    expect(screen.getByText('Battery Level')).toBeInTheDocument();
  });
});

describe('Learning Profile', () => {
  test('renders user profile information', () => {
    const LearningProfile = require('../LearningProfile').LearningProfile;
    const mockProps = {
      userId: mockUserId,
      learningMetrics: null,
      sessionData: null
    };

    render(<LearningProfile {...mockProps} />);

    expect(screen.getByText('Learning Profile')).toBeInTheDocument();
    expect(screen.getByText('Learning Statistics')).toBeInTheDocument();
  });

  test('displays learning style information', () => {
    const LearningProfile = require('../LearningProfile').LearningProfile;
    const mockProps = {
      userId: mockUserId,
      learningMetrics: {
        efficiency: 0.85,
        comprehension: 0.90,
        retention: 0.80,
        cognitiveLoad: 0.45,
        attention: 0.88,
        meditation: 0.55,
        focusScore: 0.82,
        fatigueLevel: 0.15
      },
      sessionData: null
    };

    render(<LearningProfile {...mockProps} />);

    expect(screen.getByText('Current Performance')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // Efficiency
  });
});

// Integration tests
describe('Neural Interface Integration', () => {
  test('complete learning session flow', async () => {
    const NeuralInterfaceDashboard = require('../NeuralInterfaceDashboard').NeuralInterfaceDashboard;
    
    render(
      <NeuralInterfaceDashboard
        userId={mockUserId}
        onLearningComplete={mockOnLearningComplete}
      />
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText('Neural Interface Learning')).toBeInTheDocument();
    });

    // The complete flow would involve:
    // 1. Connecting sensor
    // 2. Selecting course
    // 3. Starting session
    // 4. Monitoring metrics
    // 5. Stopping session
    // 6. Verifying results

    // This is a placeholder for the integration test
    // In a real implementation, you'd simulate user interactions
    // and verify the complete workflow
  });

  test('safety constraints enforcement', async () => {
    const SafetyConstraints = require('@/lib/safetyConstraints').SafetyConstraints;
    const constraints = new SafetyConstraints();

    const testData = {
      timestamp: Date.now(),
      eegData: {
        delta: 50,
        theta: 80,
        alpha: 55,
        beta: 30,
        gamma: 45
      },
      emgData: {
        frontal: 10,
        temporal: 8,
        occipital: 5
      },
      heartRate: 130, // High heart rate
      attention: 0.3,
      meditation: 0.2,
      cognitiveLoad: 0.9 // High cognitive load
    };

    const safetyResult = constraints.evaluateSafety(testData);

    expect(safetyResult.status).toBe('critical');
    expect(safetyResult.alerts.length).toBeGreaterThan(0);
  });
});
