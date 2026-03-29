import { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';

export interface EmotionState {
  dominantEmotion: Emotion;
  engagementScore: number;
  frustrationScore: number;
  isDetecting: boolean;
  error?: string;
}

export const useEmotionDetection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<EmotionState>({
    dominantEmotion: 'neutral',
    engagementScore: 50,
    frustrationScore: 0,
    isDetecting: false,
  });
  const streamRef = useRef<MediaStream | null>(null);

  const startDetection = useCallback(async () => {
    try {
      // Privacy compliance: Explicit consent required for camera. Data never leaves the client.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setState(prev => ({ ...prev, isDetecting: true, error: undefined }));
      
      // TensorFlow.js model integration point (simulation for demonstration logic)
      const detectionInterval = setInterval(() => {
        if (!videoRef.current || !streamRef.current) return;
        
        const emotions: Emotion[] = ['neutral', 'happy', 'sad', 'angry', 'surprised'];
        const detectedEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        
        const isFrustrated = detectedEmotion === 'angry' || detectedEmotion === 'sad';
        const isEngaged = detectedEmotion === 'happy' || detectedEmotion === 'surprised' || detectedEmotion === 'neutral';
        
        setState(prev => ({
          dominantEmotion: detectedEmotion,
          engagementScore: Math.min(100, Math.max(0, prev.engagementScore + (isEngaged ? 5 : -5))),
          frustrationScore: Math.min(100, Math.max(0, prev.frustrationScore + (isFrustrated ? 8 : -3))),
          isDetecting: true
        }));
      }, 2000);

      return () => clearInterval(detectionInterval);
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Camera access denied or unavailable. Privacy settings may be blocking access.', isDetecting: false }));
    }
  }, []);

  const stopDetection = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setState(prev => ({ ...prev, isDetecting: false, engagementScore: 50, frustrationScore: 0 }));
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return { videoRef, ...state, startDetection, stopDetection };
};