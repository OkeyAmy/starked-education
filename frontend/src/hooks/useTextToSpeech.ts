import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTextToSpeechOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
}

interface UseTextToSpeechReturn {
  speak: (text: string, options?: Partial<UseTextToSpeechOptions>) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  speaking: boolean;
  paused: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  error: string | null;
}

export const useTextToSpeech = (defaultOptions: UseTextToSpeechOptions = {}): UseTextToSpeechReturn => {
  const {
    language = 'en-US',
    rate = 1,
    pitch = 1,
    volume = 1,
    voice: defaultVoice
  } = defaultOptions;

  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Check for browser support and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
      synthRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };
      
      // Load voices immediately
      loadVoices();
      
      // Voices load asynchronously, so listen for the event
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      setSupported(false);
      setError('Text-to-speech is not supported in this browser');
    }
  }, []);

  const speak = useCallback((text: string, options: Partial<UseTextToSpeechOptions> = {}) => {
    if (!supported || !synthRef.current) {
      setError('Text-to-speech not supported');
      return;
    }

    if (!text || text.trim() === '') {
      setError('No text to speak');
      return;
    }

    // Cancel any ongoing speech
    cancel();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set utterance properties
      utterance.lang = options.language || language;
      utterance.rate = options.rate || rate;
      utterance.pitch = options.pitch || pitch;
      utterance.volume = options.volume || volume;
      
      // Set voice if specified
      if (options.voice || defaultVoice) {
        const selectedVoice = voices.find(voice => 
          voice.name === (options.voice || defaultVoice) ||
          voice.lang === (options.voice || defaultVoice)
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      
      // Event handlers
      utterance.onstart = () => {
        setSpeaking(true);
        setPaused(false);
        setError(null);
        console.log('Text-to-speech started');
      };
      
      utterance.onend = () => {
        setSpeaking(false);
        setPaused(false);
        utteranceRef.current = null;
        console.log('Text-to-speech ended');
      };
      
      utterance.onerror = (event) => {
        console.error('Text-to-speech error:', event);
        setError(getErrorMessage(event.error));
        setSpeaking(false);
        setPaused(false);
        utteranceRef.current = null;
      };
      
      utterance.onpause = () => {
        setPaused(true);
        console.log('Text-to-speech paused');
      };
      
      utterance.onresume = () => {
        setPaused(false);
        console.log('Text-to-speech resumed');
      };
      
      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
      
    } catch (err) {
      console.error('Error starting text-to-speech:', err);
      setError('Failed to start text-to-speech');
    }
  }, [supported, language, rate, pitch, volume, defaultVoice, voices]);

  const cancel = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setSpeaking(false);
      setPaused(false);
      utteranceRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (synthRef.current && speaking && !paused) {
      synthRef.current.pause();
    }
  }, [speaking, paused]);

  const resume = useCallback(() => {
    if (synthRef.current && speaking && paused) {
      synthRef.current.resume();
    }
  }, [speaking, paused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    speak,
    cancel,
    pause,
    resume,
    speaking,
    paused,
    supported,
    voices,
    error
  };
};

function getErrorMessage(error: string): string {
  switch (error) {
    case 'network':
      return 'Network error occurred while processing speech.';
    case 'synthesis-unavailable':
      return 'Speech synthesis is currently unavailable.';
    case 'synthesis-failed':
      return 'Speech synthesis failed. Please try again.';
    case 'language-unavailable':
      return 'Selected language is not available for text-to-speech.';
    case 'voice-unavailable':
      return 'Selected voice is not available.';
    case 'text-too-long':
      return 'Text is too long for speech synthesis.';
    case 'rate-not-supported':
      return 'Speech rate is not supported.';
    default:
      return 'Text-to-speech error occurred. Please try again.';
  }
}
