import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NanoLearningHub } from '../NanoLearning/NanoLearningHub';
import type { Skill } from '../../types/nanotech';

jest.mock('../../hooks/useNeuralInterface', () => ({
  useNeuralInterface: jest.fn(() => ({
    neuralPattern: null,
    error: null,
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
  }))
}));

jest.mock('../../hooks/useSkillAcquisition', () => ({
  useSkillAcquisition: jest.fn(() => ({
    swarmStatus: null,
    error: null,
    initiateTransfer: jest.fn(),
    stopTransfer: jest.fn(),
  }))
}));

jest.mock('../../hooks/useNanotechMonitoring', () => ({
  useNanotechMonitoring: jest.fn(() => ({
    safetyStatus: null,
    error: null,
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    emergencyShutdown: jest.fn(),
  }))
}));

function suppressConsoleError() {
  (console.error as any).mockRestore?.();
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

function restoreConsoleError(spy: jest.SpyInstance) {
  spy.mockRestore();
}

const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'Neural Programming',
    difficulty: 3,
    category: 'technical',
  } as Skill,
];

describe('NanoLearningHub error boundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
  });

  afterEach(() => {
    restoreConsoleError(consoleErrorSpy);
  });

  describe('when no error occurs', () => {
    it('renders the hub content normally', () => {
      render(<NanoLearningHub userId="test-user" availableSkills={mockSkills} />);
      expect(screen.getByText(/nanotechnology learning hub/i)).toBeInTheDocument();
      expect(screen.getByText('Neural Programming')).toBeInTheDocument();
    });

    it('does not show ErrorBoundary fallback UI', () => {
      render(<NanoLearningHub userId="test-user" availableSkills={mockSkills} />);
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.queryByText('Go Home')).not.toBeInTheDocument();
    });
  });

  describe('with error boundary wrapping', () => {
    it('renders without crashing with empty skills', () => {
      render(<NanoLearningHub userId="test-user" availableSkills={[]} />);
      expect(screen.getByText(/no skills available/i)).toBeInTheDocument();
    });

    it('shows the main UI sections', () => {
      render(<NanoLearningHub userId="test-user" availableSkills={mockSkills} />);
      expect(screen.getByText(/available skills/i)).toBeInTheDocument();
      const neuralHeadings = screen.getAllByText(/neural monitoring/i);
      expect(neuralHeadings.length).toBeGreaterThan(0);
    });
  });
});
