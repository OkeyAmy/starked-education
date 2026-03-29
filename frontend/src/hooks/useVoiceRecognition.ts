'use client';

import { useState, useEffect, useCallback } from 'react';

interface VoiceRecognitionState {
  isListening: boolean;
  transcript: string;
  error: string | null;
  interimTranscript: string;
}

export const useVoiceRecognition = (lang: string = 'en-US') => {
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    transcript: '',
    error: null,
    interimTranscript: '',
  });

  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = lang;

        recognitionInstance.onstart = () => {
          setState((prev) => ({ ...prev, isListening: true, error: null }));
        };

        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          setState((prev) => ({
            ...prev,
            transcript: prev.transcript + finalTranscript,
            interimTranscript: interimTranscript,
          }));
        };

        recognitionInstance.onerror = (event: any) => {
          setState((prev) => ({ ...prev, error: event.error, isListening: false }));
        };

        recognitionInstance.onend = () => {
          setState((prev) => ({ ...prev, isListening: false }));
        };

        setRecognition(recognitionInstance);
      } else {
        setState((prev) => ({ ...prev, error: 'Speech Recognition not supported in this browser' }));
      }
    }
  }, [lang]);

  const startListening = useCallback(() => {
    if (recognition) {
      try {
        recognition.start();
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }
  }, [recognition]);

  const resetTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: '', interimTranscript: '' }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  };
};
