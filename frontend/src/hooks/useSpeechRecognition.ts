import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  supported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  // Check for browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setSupported(true);
        
        const recognition = new SpeechRecognition();
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = language;
        
        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
          console.log('Speech recognition started');
        };
        
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscriptText = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscriptText += transcript;
            }
          }
          
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            setInterimTranscript('');
          } else {
            setInterimTranscript(interimTranscriptText);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError(getErrorMessage(event.error));
          setIsListening(false);
          
          // Auto-retry on certain errors
          if (event.error === 'network' || event.error === 'service-not-allowed') {
            setTimeout(() => {
              if (isListening) {
                startListening();
              }
            }, 3000);
          }
        };
        
        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
          console.log('Speech recognition ended');
        };
        
        recognitionRef.current = recognition;
      } else {
        setSupported(false);
        setError('Speech recognition is not supported in this browser');
      }
    }
    
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [language, continuous, interimResults]);

  const startListening = useCallback(() => {
    if (!supported || !recognitionRef.current) {
      setError('Speech recognition not supported');
      return;
    }
    
    try {
      recognitionRef.current.start();
      
      // Auto-stop after 2 minutes of silence
      timeoutRef.current = setTimeout(() => {
        if (isListening) {
          stopListening();
        }
      }, 120000);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start speech recognition');
    }
  }, [supported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    supported,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
};

function getErrorMessage(error: string): string {
  switch (error) {
    case 'network':
      return 'Network error. Please check your internet connection.';
    case 'service-not-allowed':
      return 'Speech recognition service is not allowed. Please check your microphone permissions.';
    case 'not-allowed':
      return 'Microphone access denied. Please allow microphone access to use voice input.';
    case 'no-speech':
      return 'No speech detected. Please try speaking clearly.';
    case 'audio-capture':
      return 'Audio capture error. Please check your microphone.';
    case 'aborted':
      return 'Speech recognition was aborted.';
    default:
      return 'Speech recognition error occurred. Please try again.';
  }
}
