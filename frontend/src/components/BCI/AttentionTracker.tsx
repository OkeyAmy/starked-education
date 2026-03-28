import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Eye, Brain, Target, TrendingUp, Clock, AlertTriangle, Zap } from 'lucide-react';
import { bciService, CognitiveState } from '../../lib/bci/bciService';

interface AttentionMetrics {
  currentAttention: number;
  currentEngagement: number;
  avgAttention: number;
  avgEngagement: number;
  peakAttention: number;
  peakEngagement: number;
  attentionSpan: number;
  focusQuality: number;
  distractionEvents: number;
}

interface AttentionEvent {
  type: 'focus' | 'distraction' | 'break' | 'return';
  timestamp: number;
  duration: number;
  intensity: number;
}

export const AttentionTracker: React.FC = () => {
  const [metrics, setMetrics] = useState<AttentionMetrics>({
    currentAttention: 0,
    currentEngagement: 0,
    avgAttention: 0,
    avgEngagement: 0,
    peakAttention: 0,
    peakEngagement: 0,
    attentionSpan: 0,
    focusQuality: 0,
    distractionEvents: 0
  });

  const [events, setEvents] = useState<AttentionEvent[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [cognitiveHistory, setCognitiveHistory] = useState<CognitiveState[]>([]);

  useEffect(() => {
    if (isTracking && bciService.isDeviceConnected()) {
      const interval = setInterval(updateMetrics, 1000);
      return () => clearInterval(interval);
    }
  }, [isTracking]);

  const updateMetrics = () => {
    const history = bciService.getCognitiveHistory();
    const currentState = bciService.getCurrentCognitiveState();

    if (history.length === 0 || !currentState) return;

    setCognitiveHistory(history);

    const newMetrics = calculateAttentionMetrics(history, currentState);
    setMetrics(newMetrics);

    const newEvents = detectAttentionEvents(history, currentState);
    if (newEvents.length > 0) {
      setEvents(prev => [...prev.slice(-19), ...newEvents]);
    }
  };

  const calculateAttentionMetrics = (history: CognitiveState[], current: CognitiveState): AttentionMetrics => {
    const recent = history.slice(-30);
    
    const avgAttention = recent.reduce((sum, state) => sum + state.attention, 0) / recent.length;
    const avgEngagement = recent.reduce((sum, state) => sum + state.engagement, 0) / recent.length;
    
    const peakAttention = Math.max(...recent.map(state => state.attention));
    const peakEngagement = Math.max(...recent.map(state => state.engagement));

    const attentionSpan = calculateAttentionSpan(recent);
    const focusQuality = calculateFocusQuality(recent);
    const distractionEvents = countDistractionEvents(recent);

    return {
      currentAttention: current.attention,
      currentEngagement: current.engagement,
      avgAttention,
      avgEngagement,
      peakAttention,
      peakEngagement,
      attentionSpan,
      focusQuality,
      distractionEvents
    };
  };

  const calculateAttentionSpan = (history: CognitiveState[]): number => {
    let maxSpan = 0;
    let currentSpan = 0;
    const threshold = 0.6;

    for (const state of history) {
      if (state.attention >= threshold && state.engagement >= threshold) {
        currentSpan++;
        maxSpan = Math.max(maxSpan, currentSpan);
      } else {
        currentSpan = 0;
      }
    }

    return maxSpan;
  };

  const calculateFocusQuality = (history: CognitiveState[]): number => {
    if (history.length === 0) return 0;

    const attention = history.reduce((sum, state) => sum + state.attention, 0) / history.length;
    const engagement = history.reduce((sum, state) => sum + state.engagement, 0) / history.length;
    const cognitiveLoad = history.reduce((sum, state) => sum + state.cognitiveLoad, 0) / history.length;

    const quality = (attention + engagement - cognitiveLoad) / 2;
    return Math.max(0, Math.min(1, quality));
  };

  const countDistractionEvents = (history: CognitiveState[]): number => {
    let distractions = 0;
    const threshold = 0.3;

    for (let i = 1; i < history.length; i++) {
      if (history[i].attention < threshold && history[i-1].attention >= threshold) {
        distractions++;
      }
    }

    return distractions;
  };

  const detectAttentionEvents = (history: CognitiveState[], current: CognitiveState): AttentionEvent[] => {
    const events: AttentionEvent[] = [];
    const threshold = 0.4;

    if (history.length >= 2) {
      const prev = history[history.length - 2];
      
      if (current.attention >= threshold && prev.attention < threshold) {
        events.push({
          type: 'focus',
          timestamp: Date.now(),
          duration: 0,
          intensity: current.attention
        });
      } else if (current.attention < threshold && prev.attention >= threshold) {
        events.push({
          type: 'distraction',
          timestamp: Date.now(),
          duration: 0,
          intensity: 1 - current.attention
        });
      }
    }

    return events;
  };

  const startTracking = () => {
    setIsTracking(true);
    setSessionStartTime(Date.now());
    setEvents([]);
  };

  const stopTracking = () => {
    setIsTracking(false);
    setSessionStartTime(null);
  };

  const formatChartData = () => {
    return cognitiveHistory.slice(-60).map((state, index) => ({
      time: index,
      attention: state.attention * 100,
      engagement: state.engagement * 100,
      cognitiveLoad: state.cognitiveLoad * 100
    }));
  };

  const getAttentionLevel = (attention: number): { label: string; color: string } => {
    if (attention >= 0.8) return { label: 'High Focus', color: 'text-green-600' };
    if (attention >= 0.6) return { label: 'Moderate Focus', color: 'text-yellow-600' };
    if (attention >= 0.4) return { label: 'Low Focus', color: 'text-orange-600' };
    return { label: 'Very Low Focus', color: 'text-red-600' };
  };

  const getSessionDuration = (): string => {
    if (!sessionStartTime) return '00:00:00';
    
    const duration = Date.now() - sessionStartTime;
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getFocusQualityColor = (quality: number): string => {
    if (quality >= 0.8) return 'text-green-600';
    if (quality >= 0.6) return 'text-yellow-600';
    if (quality >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Eye className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Attention & Engagement Tracker</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span className="text-gray-600 font-medium">{getSessionDuration()}</span>
          </div>
          <button
            onClick={isTracking ? stopTracking : startTracking}
            disabled={!bciService.isDeviceConnected()}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isTracking 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
            }`}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        </div>
      </div>

      {isTracking && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-blue-600 font-medium">Current Attention</span>
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-800 mt-2">
              {(metrics.currentAttention * 100).toFixed(1)}%
            </div>
            <div className={`text-sm mt-1 ${getAttentionLevel(metrics.currentAttention).color}`}>
              {getAttentionLevel(metrics.currentAttention).label}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-green-600 font-medium">Current Engagement</span>
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-800 mt-2">
              {(metrics.currentEngagement * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-green-600 mt-1">
              {metrics.currentEngagement >= 0.7 ? 'Highly Engaged' : 
               metrics.currentEngagement >= 0.4 ? 'Moderately Engaged' : 'Low Engagement'}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-purple-600 font-medium">Focus Quality</span>
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <div className={`text-2xl font-bold mt-2 ${getFocusQualityColor(metrics.focusQuality)}`}>
              {(metrics.focusQuality * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-purple-600 mt-1">
              Attention Span: {metrics.attentionSpan}s
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-orange-600 font-medium">Distractions</span>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-800 mt-2">
              {metrics.distractionEvents}
            </div>
            <div className="text-sm text-orange-600 mt-1">
              Peak: {(metrics.peakAttention * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Attention Timeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={formatChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="attention" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="engagement" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Cognitive Load Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formatChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cognitiveLoad" stroke="#F97316" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {events.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Events</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {events.slice().reverse().map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className={`p-2 rounded-lg text-sm ${
                  event.type === 'focus' ? 'bg-green-50 text-green-800' :
                  event.type === 'distraction' ? 'bg-red-50 text-red-800' :
                  event.type === 'break' ? 'bg-yellow-50 text-yellow-800' :
                  'bg-blue-50 text-blue-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {event.type === 'focus' && <Brain className="w-4 h-4" />}
                    {event.type === 'distraction' && <AlertTriangle className="w-4 h-4" />}
                    {event.type === 'break' && <Clock className="w-4 h-4" />}
                    {event.type === 'return' && <TrendingUp className="w-4 h-4" />}
                    <span className="capitalize">{event.type}</span>
                  </div>
                  <span className="text-xs opacity-75">
                    Intensity: {(event.intensity * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isTracking && (
        <div className="text-center py-8 text-gray-500">
          <Eye className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>Start tracking to monitor your attention and engagement levels</p>
        </div>
      )}
    </div>
  );
};
