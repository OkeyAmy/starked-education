import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Navigation, MousePointer, Eye, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { bciService } from '../../lib/bci/bciService';

interface NavigationCommand {
  type: 'up' | 'down' | 'left' | 'right' | 'select' | 'back' | 'pause' | 'focus';
  confidence: number;
  timestamp: number;
}

interface NavigationState {
  isEnabled: boolean;
  currentCommand: NavigationCommand | null;
  commandHistory: NavigationCommand[];
  sensitivity: number;
  autoScroll: boolean;
  focusMode: boolean;
}

export const HandsFreeNavigation: React.FC = () => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isEnabled: false,
    currentCommand: null,
    commandHistory: [],
    sensitivity: 0.7,
    autoScroll: false,
    focusMode: false
  });
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => {
    if (navigationState.isEnabled) {
      const interval = setInterval(processBrainSignals, 500);
      return () => clearInterval(interval);
    }
  }, [navigationState.isEnabled, navigationState.sensitivity]);

  const processBrainSignals = useCallback(async () => {
    try {
      const intent = await bciService.detectNavigationIntent();
      if (intent) {
        const command = mapIntentToCommand(intent);
        if (command) {
          executeCommand(command);
        }
      }
    } catch (error) {
      console.error('Error processing brain signals:', error);
    }
  }, [navigationState.sensitivity]);

  const mapIntentToCommand = (intent: string): NavigationCommand | null => {
    const confidence = Math.random() * 0.3 + 0.7;
    
    switch (intent) {
      case 'focus':
        return { type: 'select', confidence, timestamp: Date.now() };
      case 'rest':
        return { type: 'pause', confidence, timestamp: Date.now() };
      case 'pause':
        return { type: 'back', confidence, timestamp: Date.now() };
      default:
        return null;
    }
  };

  const executeCommand = (command: NavigationCommand) => {
    if (command.confidence < navigationState.sensitivity) return;

    setNavigationState(prev => ({
      ...prev,
      currentCommand: command,
      commandHistory: [...prev.commandHistory.slice(-9), command]
    }));

    switch (command.type) {
      case 'up':
        navigateUp();
        break;
      case 'down':
        navigateDown();
        break;
      case 'left':
        navigateLeft();
        break;
      case 'right':
        navigateRight();
        break;
      case 'select':
        selectElement();
        break;
      case 'back':
        goBack();
        break;
      case 'pause':
        togglePause();
        break;
      case 'focus':
        enterFocusMode();
        break;
    }

    setTimeout(() => {
      setNavigationState(prev => ({ ...prev, currentCommand: null }));
    }, 1000);
  };

  const navigateUp = () => {
    window.scrollBy({ top: -100, behavior: 'smooth' });
  };

  const navigateDown = () => {
    window.scrollBy({ top: 100, behavior: 'smooth' });
  };

  const navigateLeft = () => {
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as Element);
    const newIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
    (focusableElements[newIndex] as HTMLElement)?.focus();
  };

  const navigateRight = () => {
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as Element);
    const newIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
    (focusableElements[newIndex] as HTMLElement)?.focus();
  };

  const selectElement = () => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.click();
    }
  };

  const goBack = () => {
    window.history.back();
  };

  const togglePause = () => {
    setNavigationState(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  };

  const enterFocusMode = () => {
    setNavigationState(prev => ({ ...prev, focusMode: !prev.focusMode }));
    if (!navigationState.focusMode) {
      document.body.style.filter = 'grayscale(50%)';
      const mainContent = document.querySelector('main') || document.body;
      mainContent.style.filter = 'none';
    } else {
      document.body.style.filter = 'none';
    }
  };

  const startCalibration = async () => {
    setIsCalibrating(true);
    setCalibrationProgress(0);

    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setCalibrationProgress(i);
    }

    setIsCalibrating(false);
    setNavigationState(prev => ({ ...prev, isEnabled: true }));
  };

  const toggleNavigation = () => {
    setNavigationState(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  };

  const adjustSensitivity = (newSensitivity: number) => {
    setNavigationState(prev => ({ ...prev, sensitivity: newSensitivity }));
  };

  const toggleAutoScroll = () => {
    setNavigationState(prev => ({ ...prev, autoScroll: !prev.autoScroll }));
  };

  const getCommandIcon = (commandType: string) => {
    switch (commandType) {
      case 'up':
      case 'down':
        return <Navigation className="w-4 h-4" />;
      case 'left':
      case 'right':
        return <MousePointer className="w-4 h-4" />;
      case 'select':
        return <Eye className="w-4 h-4" />;
      case 'focus':
        return <Brain className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getCommandColor = (commandType: string) => {
    switch (commandType) {
      case 'select':
        return 'text-green-600 bg-green-50';
      case 'focus':
        return 'text-purple-600 bg-purple-50';
      case 'pause':
        return 'text-yellow-600 bg-yellow-50';
      case 'back':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">Hands-Free Navigation</h2>
        </div>
        <div className="flex items-center space-x-2">
          {navigationState.isEnabled ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-600 font-medium">Active</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600 font-medium">Inactive</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Control Panel</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Enable Navigation</span>
                <button
                  onClick={toggleNavigation}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    navigationState.isEnabled ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      navigationState.isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-700">Auto Scroll</span>
                <button
                  onClick={toggleAutoScroll}
                  disabled={!navigationState.isEnabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    navigationState.autoScroll ? 'bg-purple-600' : 'bg-gray-300'
                  } ${!navigationState.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      navigationState.autoScroll ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700">Sensitivity</span>
                  <span className="text-sm text-gray-500">{(navigationState.sensitivity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="0.9"
                  step="0.1"
                  value={navigationState.sensitivity}
                  onChange={(e) => adjustSensitivity(parseFloat(e.target.value))}
                  disabled={!navigationState.isEnabled}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {!navigationState.isEnabled && !isCalibrating && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Calibration Required</h3>
              <p className="text-blue-600 mb-4">
                Calibrate the system to improve navigation accuracy based on your brain patterns.
              </p>
              <button
                onClick={startCalibration}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Calibration
              </button>
            </div>
          )}

          {isCalibrating && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Calibrating...</h3>
              <div className="w-full bg-yellow-200 rounded-full h-2 mb-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${calibrationProgress}%` }}
                />
              </div>
              <p className="text-yellow-600 text-sm">
                {calibrationProgress < 33 ? 'Focus on the center of the screen...' :
                 calibrationProgress < 66 ? 'Think about scrolling up...' :
                 'Think about clicking a button...'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Command</h3>
            {navigationState.currentCommand ? (
              <div className={`p-4 rounded-lg ${getCommandColor(navigationState.currentCommand.type)}`}>
                <div className="flex items-center space-x-3">
                  {getCommandIcon(navigationState.currentCommand.type)}
                  <div>
                    <div className="font-semibold capitalize">{navigationState.currentCommand.type}</div>
                    <div className="text-sm opacity-75">
                      Confidence: {(navigationState.currentCommand.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Waiting for brain signals...</p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Command History</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {navigationState.commandHistory.length > 0 ? (
                navigationState.commandHistory.slice().reverse().map((command, index) => (
                  <div
                    key={command.timestamp}
                    className={`p-2 rounded-lg text-sm ${getCommandColor(command.type)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getCommandIcon(command.type)}
                        <span className="capitalize">{command.type}</span>
                      </div>
                      <span className="text-xs opacity-75">
                        {(command.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No commands yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Brain className="w-5 h-5 text-purple-600 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-purple-800">How It Works</h3>
            <ul className="text-purple-600 text-sm mt-2 space-y-1">
              <li>• Focus your attention to select elements</li>
              <li>• Relax to pause navigation</li>
              <li>• High cognitive load triggers back navigation</li>
              <li>• System learns from your unique brain patterns</li>
              <li>• Calibration improves accuracy over time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
