import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BCIDashboard } from '../BCI/BCIDashboard';

jest.mock('../BCI/CognitiveDashboard', () => ({
  CognitiveDashboard: () => { throw new Error('Cognitive dashboard crash'); }
}));

jest.mock('../BCI/HandsFreeNavigation', () => ({
  HandsFreeNavigation: () => <div>HandsFree Navigation Content</div>
}));

jest.mock('../BCI/AttentionTracker', () => ({
  AttentionTracker: () => <div>Attention Tracker Content</div>
}));

jest.mock('../BCI/AdaptiveDifficulty', () => ({
  AdaptiveDifficulty: () => <div>Adaptive Difficulty Content</div>
}));

jest.mock('../BCI/NeurofeedbackTraining', () => ({
  NeurofeedbackTraining: () => <div>Neurofeedback Training Content</div>
}));

function suppressConsoleError() {
  (console.error as any).mockRestore?.();
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

function restoreConsoleError(spy: jest.SpyInstance) {
  spy.mockRestore();
}

function setNodeEnv(value: string) {
  Object.assign(process.env, { NODE_ENV: value });
}

const ORIGINAL_ENV = { ...process.env };

describe('BCIDashboard error boundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    Object.assign(process.env, { NODE_ENV: ORIGINAL_ENV.NODE_ENV });
    consoleErrorSpy = suppressConsoleError();
  });

  afterEach(() => {
    restoreConsoleError(consoleErrorSpy);
  });

  describe('when active tab crashes', () => {
    it('shows RouteErrorBoundary fallback for the crashing tab', () => {
      render(<BCIDashboard />);
      expect(screen.getByText(/could not load cognitive monitor/i)).toBeInTheDocument();
      expect(screen.getByText('Retry Section')).toBeInTheDocument();
    });

    it('sidebar navigation remains functional when a tab crashes', () => {
      render(<BCIDashboard />);
      expect(screen.getByText(/could not load cognitive monitor/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Hands-Free Control'));
      expect(screen.getByText('HandsFree Navigation Content')).toBeInTheDocument();
    });

    it('switching to a non-crashing tab recovers from error', () => {
      render(<BCIDashboard />);
      expect(screen.getByText(/could not load cognitive monitor/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Attention Tracking'));
      expect(screen.getByText('Attention Tracker Content')).toBeInTheDocument();
    });
  });

  describe('error details in dev mode', () => {
    afterEach(() => {
      setNodeEnv(ORIGINAL_ENV.NODE_ENV || 'test');
    });

    it('shows error message in development mode', () => {
      setNodeEnv('development');
      render(<BCIDashboard />);
      expect(screen.getByText('Cognitive dashboard crash')).toBeInTheDocument();
    });

    it('shows "Error Details" collapsible section in dev mode', () => {
      setNodeEnv('development');
      render(<BCIDashboard />);
      expect(screen.getByText('Error Details')).toBeInTheDocument();
    });
  });

  describe('error handling in production mode', () => {
    afterEach(() => {
      setNodeEnv(ORIGINAL_ENV.NODE_ENV || 'test');
    });

    it('shows generic message in production mode', () => {
      setNodeEnv('production');
      render(<BCIDashboard />);
      expect(screen.getByText(/an error occurred loading this section/i)).toBeInTheDocument();
      expect(screen.queryByText('Cognitive dashboard crash')).not.toBeInTheDocument();
    });

    it('does not show "Error Details" section in production mode', () => {
      setNodeEnv('production');
      render(<BCIDashboard />);
      expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('error UI has proper heading structure', () => {
      render(<BCIDashboard />);
      const headings = screen.getAllByRole('heading', { level: 3 });
      const errorHeading = headings.find(h => h.textContent?.includes('Could not load'));
      expect(errorHeading).toBeTruthy();
      expect(errorHeading).toHaveTextContent(/could not load cognitive monitor/i);
    });

    it('has an accessible retry button', () => {
      render(<BCIDashboard />);
      expect(screen.getByRole('button', { name: /retry section/i })).toBeInTheDocument();
    });
  });
});
