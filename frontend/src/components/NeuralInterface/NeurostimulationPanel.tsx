'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Settings, Play, Pause, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { NeurostimulationSettings, StimulationProtocol } from '@/types/neural';

interface NeurostimulationPanelProps {
  isSessionActive: boolean;
  onStimulationChange: (settings: NeurostimulationSettings) => void;
}

export const NeurostimulationPanel: React.FC<NeurostimulationPanelProps> = ({
  isSessionActive,
  onStimulationChange
}) => {
  const [currentSettings, setCurrentSettings] = useState<NeurostimulationSettings>({
    intensity: 50,
    frequency: 10,
    duration: 1800,
    targetRegions: ['prefrontal', 'parietal'],
    protocol: 'tDCS',
    safetyLimits: {
      maxIntensity: 2000,
      maxDuration: 3600,
      minRestPeriod: 300,
      dailyLimit: 7200
    }
  });

  const [isStimulating, setIsStimulating] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<StimulationProtocol | null>(null);
  const [protocols] = useState<StimulationProtocol[]>([
    {
      id: 'focus-enhancement',
      name: 'Focus Enhancement',
      description: 'Increases attention and concentration during learning',
      settings: {
        intensity: 1000,
        frequency: 10,
        duration: 1800,
        targetRegions: ['prefrontal', 'parietal'],
        protocol: 'tDCS',
        safetyLimits: currentSettings.safetyLimits
      },
      targetOutcome: 'Improved focus and attention',
      efficacy: 0.85,
      researchPapers: ['DOI:10.1016/j.neuroimage.2020.117123']
    },
    {
      id: 'memory-consolidation',
      name: 'Memory Consolidation',
      description: 'Enhances memory formation and retention',
      settings: {
        intensity: 750,
        frequency: 6,
        duration: 2400,
        targetRegions: ['temporal', 'hippocampal'],
        protocol: 'tACS',
        safetyLimits: currentSettings.safetyLimits
      },
      targetOutcome: 'Better memory retention',
      efficacy: 0.78,
      researchPapers: ['DOI:10.1038/s41598-020-12345']
    },
    {
      id: 'cognitive-flexibility',
      name: 'Cognitive Flexibility',
      description: 'Improves problem-solving and creative thinking',
      settings: {
        intensity: 1500,
        frequency: 40,
        duration: 1500,
        targetRegions: ['dorsolateral', 'frontal'],
        protocol: 'tRNS',
        safetyLimits: currentSettings.safetyLimits
      },
      targetOutcome: 'Enhanced cognitive flexibility',
      efficacy: 0.72,
      researchPapers: ['DOI:10.1016/j.cortex.2021.105789']
    }
  ]);

  useEffect(() => {
    onStimulationChange(currentSettings);
  }, [currentSettings, onStimulationChange]);

  const handleProtocolSelect = (protocol: StimulationProtocol) => {
    setSelectedProtocol(protocol);
    setCurrentSettings(protocol.settings);
  };

  const handleSettingChange = (key: keyof NeurostimulationSettings, value: any) => {
    const newSettings = { ...currentSettings, [key]: value };
    
    // Apply safety limits
    if (key === 'intensity' && value > currentSettings.safetyLimits.maxIntensity) {
      return;
    }
    if (key === 'duration' && value > currentSettings.safetyLimits.maxDuration) {
      return;
    }
    
    setCurrentSettings(newSettings);
  };

  const toggleStimulation = () => {
    if (!isSessionActive) return;
    
    setIsStimulating(!isStimulating);
    
    if (!isStimulating) {
      // Start stimulation
      console.log('Starting neurostimulation with settings:', currentSettings);
    } else {
      // Stop stimulation
      console.log('Stopping neurostimulation');
    }
  };

  const getIntensityColor = (intensity: number) => {
    const percentage = (intensity / currentSettings.safetyLimits.maxIntensity) * 100;
    if (percentage < 50) return 'text-green-400';
    if (percentage < 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-semibold">Neurostimulation</h2>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
          isStimulating ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
        }`}>
          {isStimulating ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {isStimulating ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Protocol Selection */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Stimulation Protocol</h3>
        <div className="space-y-2">
          {protocols.map((protocol) => (
            <div
              key={protocol.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedProtocol?.id === protocol.id
                  ? 'bg-purple-500/20 border-purple-400'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              onClick={() => handleProtocolSelect(protocol)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">{protocol.name}</div>
                <div className="text-xs text-green-400">
                  {Math.round(protocol.efficacy * 100)}% efficacy
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-2">{protocol.description}</div>
              <div className="text-xs text-gray-500">Target: {protocol.targetOutcome}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stimulation Settings */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">Intensity (μA)</label>
            <span className={`text-sm font-medium ${getIntensityColor(currentSettings.intensity)}`}>
              {currentSettings.intensity} μA
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={currentSettings.safetyLimits.maxIntensity}
            value={currentSettings.intensity}
            onChange={(e) => handleSettingChange('intensity', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            disabled={!isSessionActive}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0 μA</span>
            <span>{currentSettings.safetyLimits.maxIntensity} μA</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">Frequency (Hz)</label>
            <span className="text-sm font-medium text-blue-400">{currentSettings.frequency} Hz</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={currentSettings.frequency}
            onChange={(e) => handleSettingChange('frequency', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            disabled={!isSessionActive}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 Hz</span>
            <span>100 Hz</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">Duration (min)</label>
            <span className="text-sm font-medium text-purple-400">
              {Math.round(currentSettings.duration / 60)} min
            </span>
          </div>
          <input
            type="range"
            min="300"
            max={currentSettings.safetyLimits.maxDuration}
            step="300"
            value={currentSettings.duration}
            onChange={(e) => handleSettingChange('duration', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            disabled={!isSessionActive}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5 min</span>
            <span>{Math.round(currentSettings.safetyLimits.maxDuration / 60)} min</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">Protocol Type</label>
          <select
            value={currentSettings.protocol}
            onChange={(e) => handleSettingChange('protocol', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            disabled={!isSessionActive}
          >
            <option value="tDCS">tDCS (Direct Current)</option>
            <option value="tACS">tACS (Alternating Current)</option>
            <option value="tRNS">tRNS (Random Noise)</option>
          </select>
        </div>
      </div>

      {/* Target Regions */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Target Brain Regions</h3>
        <div className="grid grid-cols-2 gap-2">
          {['prefrontal', 'parietal', 'temporal', 'occipital', 'motor', 'frontal'].map((region) => (
            <label key={region} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentSettings.targetRegions.includes(region)}
                onChange={(e) => {
                  const regions = e.target.checked
                    ? [...currentSettings.targetRegions, region]
                    : currentSettings.targetRegions.filter(r => r !== region);
                  handleSettingChange('targetRegions', regions);
                }}
                className="rounded border-gray-600 bg-white/10 text-purple-600 focus:ring-purple-500"
                disabled={!isSessionActive}
              />
              <span className="text-sm text-gray-300 capitalize">{region}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Safety Information */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-300">
            <div className="font-medium mb-1">Safety Guidelines</div>
            <ul className="text-xs space-y-1 text-blue-200">
              <li>• Maximum intensity: {currentSettings.safetyLimits.maxIntensity} μA</li>
              <li>• Maximum session duration: {Math.round(currentSettings.safetyLimits.maxDuration / 60)} minutes</li>
              <li>• Minimum rest period: {Math.round(currentSettings.safetyLimits.minRestPeriod / 60)} minutes</li>
              <li>• Daily limit: {Math.round(currentSettings.safetyLimits.dailyLimit / 60)} minutes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Control Button */}
      <button
        onClick={toggleStimulation}
        disabled={!isSessionActive}
        className={`w-full px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-medium ${
          !isSessionActive
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : isStimulating
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {isStimulating ? (
          <>
            <Pause className="h-4 w-4" />
            Stop Stimulation
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Start Stimulation
          </>
        )}
      </button>

      {selectedProtocol && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">Protocol Active</span>
          </div>
          <div className="text-xs text-green-300">
            {selectedProtocol.name} - {Math.round(selectedProtocol.efficacy * 100)}% efficacy rate
          </div>
        </div>
      )}
    </div>
  );
};
