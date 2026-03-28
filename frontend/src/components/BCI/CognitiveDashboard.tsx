import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Brain, Activity, Zap, AlertCircle, TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';
import { bciService, CognitiveState } from '../../lib/bci/bciService';
import { mlModel, MLPrediction } from '../../lib/bci/mlModel';

interface DashboardMetrics {
  avgAttention: number;
  avgRelaxation: number;
  avgEngagement: number;
  avgCognitiveLoad: number;
  trend: 'up' | 'down' | 'stable';
  efficiency: number;
}

export const CognitiveDashboard: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentCognitiveState, setCurrentCognitiveState] = useState<CognitiveState | null>(null);
  const [cognitiveHistory, setCognitiveHistory] = useState<CognitiveState[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    avgAttention: 0,
    avgRelaxation: 0,
    avgEngagement: 0,
    avgCognitiveLoad: 0,
    trend: 'stable',
    efficiency: 0
  });
  const [prediction, setPrediction] = useState<MLPrediction | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  useEffect(() => {
    loadAvailableDevices();
    const interval = setInterval(updateData, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsConnected(bciService.isDeviceConnected());
  }, []);

  const loadAvailableDevices = async () => {
    try {
      const availableDevices = await bciService.getAvailableDevices();
      setDevices(availableDevices);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const updateData = async () => {
    if (!isConnected) return;

    try {
      const currentState = bciService.getCurrentCognitiveState();
      const history = bciService.getCognitiveHistory();
      
      setCurrentCognitiveState(currentState);
      setCognitiveHistory(history);

      if (currentState && history.length > 0) {
        const newMetrics = calculateMetrics(history);
        setMetrics(newMetrics);

        const features = mlModel.extractFeatures(bciService.getSignalBuffer(), history);
        const predictionResult = await mlModel.predict(features);
        setPrediction(predictionResult);
      }
    } catch (error) {
      console.error('Error updating dashboard data:', error);
    }
  };

  const calculateMetrics = (history: CognitiveState[]): DashboardMetrics => {
    if (history.length === 0) {
      return {
        avgAttention: 0,
        avgRelaxation: 0,
        avgEngagement: 0,
        avgCognitiveLoad: 0,
        trend: 'stable',
        efficiency: 0
      };
    }

    const recent = history.slice(-10);
    const older = history.slice(-20, -10);

    const avgAttention = recent.reduce((sum, state) => sum + state.attention, 0) / recent.length;
    const avgRelaxation = recent.reduce((sum, state) => sum + state.relaxation, 0) / recent.length;
    const avgEngagement = recent.reduce((sum, state) => sum + state.engagement, 0) / recent.length;
    const avgCognitiveLoad = recent.reduce((sum, state) => sum + state.cognitiveLoad, 0) / recent.length;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (older.length > 0) {
      const oldAvg = older.reduce((sum, state) => sum + state.attention, 0) / older.length;
      const diff = avgAttention - oldAvg;
      if (diff > 0.1) trend = 'up';
      else if (diff < -0.1) trend = 'down';
    }

    const efficiency = Math.max(0, (avgAttention + avgEngagement - avgCognitiveLoad) / 2);

    return {
      avgAttention,
      avgRelaxation,
      avgEngagement,
      avgCognitiveLoad,
      trend,
      efficiency
    };
  };

  const connectDevice = async () => {
    if (!selectedDevice) return;

    try {
      const success = await bciService.connectDevice(selectedDevice);
      if (success) {
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to connect device:', error);
    }
  };

  const disconnectDevice = async () => {
    try {
      await bciService.disconnectDevice();
      setIsConnected(false);
      setCurrentCognitiveState(null);
      setCognitiveHistory([]);
      setPrediction(null);
    } catch (error) {
      console.error('Failed to disconnect device:', error);
    }
  };

  const formatChartData = () => {
    return cognitiveHistory.slice(-20).map((state, index) => ({
      time: index,
      attention: state.attention * 100,
      relaxation: state.relaxation * 100,
      engagement: state.engagement * 100,
      cognitiveLoad: state.cognitiveLoad * 100
    }));
  };

  const formatRadarData = () => {
    if (!currentCognitiveState) return [];
    
    return [
      { metric: 'Attention', value: currentCognitiveState.attention * 100 },
      { metric: 'Relaxation', value: currentCognitiveState.relaxation * 100 },
      { metric: 'Engagement', value: currentCognitiveState.engagement * 100 },
      { metric: 'Cognitive Load', value: (1 - currentCognitiveState.cognitiveLoad) * 100 }
    ];
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency > 0.7) return 'text-green-600';
    if (efficiency > 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = () => {
    switch (metrics.trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">Cognitive State Monitor</h2>
        </div>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <Wifi className="w-5 h-5 text-green-600" />
              <span className="text-green-600 font-medium">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-red-600" />
              <span className="text-red-600 font-medium">Disconnected</span>
            </>
          )}
        </div>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select a BCI device</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
            <button
              onClick={connectDevice}
              disabled={!selectedDevice}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Connect
            </button>
          </div>
          <div className="text-center py-8 text-gray-500">
            <Brain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>Connect a BCI device to start monitoring your cognitive state</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <button
              onClick={disconnectDevice}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Disconnect
            </button>
            {getTrendIcon()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">Attention</span>
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-800 mt-2">
                {(metrics.avgAttention * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">Relaxation</span>
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-800 mt-2">
                {(metrics.avgRelaxation * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-purple-600 font-medium">Engagement</span>
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-800 mt-2">
                {(metrics.avgEngagement * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-orange-600 font-medium">Cognitive Load</span>
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-800 mt-2">
                {(metrics.avgCognitiveLoad * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Learning Efficiency</span>
              <span className={`text-2xl font-bold ${getEfficiencyColor(metrics.efficiency)}`}>
                {(metrics.efficiency * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  metrics.efficiency > 0.7 ? 'bg-green-600' :
                  metrics.efficiency > 0.4 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${metrics.efficiency * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Cognitive State Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formatChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="attention" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="relaxation" stroke="#10B981" strokeWidth={2} />
                  <Line type="monotone" dataKey="engagement" stroke="#8B5CF6" strokeWidth={2} />
                  <Line type="monotone" dataKey="cognitiveLoad" stroke="#F97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Current State Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={formatRadarData()}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {prediction && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-800">ML Prediction</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Attention</span>
                  <div className="font-semibold text-gray-800">{(prediction.attention * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Relaxation</span>
                  <div className="font-semibold text-gray-800">{(prediction.relaxation * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Engagement</span>
                  <div className="font-semibold text-gray-800">{(prediction.engagement * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Confidence</span>
                  <div className="font-semibold text-gray-800">{(prediction.confidence * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
