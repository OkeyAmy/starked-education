import React, { useEffect, useState } from 'react';
import { useEmotionDetection } from '../../hooks/useEmotionDetection';

export const EmotionDashboard: React.FC = () => {
  const { videoRef, dominantEmotion, engagementScore, frustrationScore, isDetecting, error, startDetection, stopDetection } = useEmotionDetection();
  const [interventionMsg, setInterventionMsg] = useState<string | null>(null);
  const [adaptedContent, setAdaptedContent] = useState<string>('Standard learning material loaded.');

  // Emotion-Based Content Adaptation System & Intervention Alerts
  useEffect(() => {
    if (!isDetecting) return;

    if (frustrationScore > 75) {
      setInterventionMsg("It looks like you might be frustrated. Would you like to take a 5-minute break or review the previous introductory section?");
      setAdaptedContent("Simplified review material loaded to reduce cognitive load.");
    } else if (engagementScore < 30) {
      setInterventionMsg("Let's try a different approach to keep things interesting!");
      setAdaptedContent("Interactive quiz loaded to boost engagement.");
    } else if (engagementScore > 80) {
      setInterventionMsg(null);
      setAdaptedContent("Advanced learning modules unlocked! You're highly engaged.");
    } else {
      setInterventionMsg(null);
      setAdaptedContent('Standard learning material loaded.');
    }
  }, [frustrationScore, engagementScore, isDetecting]);

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Learning Emotion Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Camera and Privacy Controls */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative mb-4">
            {!isDetecting && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-800">
                Camera off (Privacy Mode)
              </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-cover ${isDetecting ? 'opacity-100' : 'opacity-0'}`} 
            />
          </div>
          
          {error && <div className="text-red-500 mb-4 text-sm font-medium">{error}</div>}
          
          <div className="flex gap-4">
            {!isDetecting ? (
              <button 
                onClick={startDetection}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Start Privacy-Safe Detection
              </button>
            ) : (
              <button 
                onClick={stopDetection}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition"
              >
                Stop Detection
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            * Data is processed entirely locally on your device using TensorFlow.js. No video or biometric data is ever recorded or sent to external servers, strictly complying with GDPR privacy standards.
          </p>
        </div>

        {/* Analytics Dashboard */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-lg border shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Current Cognitive State</h3>
            <div className="flex items-center justify-between mb-6">
              <span className="text-gray-600 font-medium">Dominant Emotion:</span>
              <span className="capitalize font-bold text-xl text-blue-600">{dominantEmotion}</span>
            </div>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-1 font-medium text-gray-700">
                  <span>Engagement Level</span>
                  <span>{engagementScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${engagementScore}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1 font-medium text-gray-700">
                  <span>Frustration Level</span>
                  <span>{frustrationScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full transition-all duration-500 ${frustrationScore > 75 ? 'bg-red-500' : frustrationScore > 40 ? 'bg-yellow-400' : 'bg-blue-400'}`} style={{ width: `${frustrationScore}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Intervention Alerts */}
          {interventionMsg && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg animate-pulse">
              <h4 className="text-orange-800 font-bold flex items-center">
                <span className="mr-2">⚠️</span> Intervention Alert
              </h4>
              <p className="text-orange-700 mt-1 text-sm font-medium">{interventionMsg}</p>
            </div>
          )}

          {/* Content Adaptation Engine */}
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
            <h4 className="text-blue-800 font-bold mb-2">Adaptive Content Engine</h4>
            <p className="text-blue-900 text-sm font-medium">{adaptedContent}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionDashboard;