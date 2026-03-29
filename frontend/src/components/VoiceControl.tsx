'use client';

import React, { useEffect, useState } from 'react';
import { Mic, MicOff, RefreshCcw, Command, CheckCircle, XCircle } from 'lucide-react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { VoiceCommandProcessor } from '../services/voiceCommandProcessor';

export const VoiceControl: React.FC = () => {
  const { isListening, transcript, interimTranscript, startListening, stopListening, resetTranscript, error } = useVoiceRecognition();
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Process voice commands in real-time as transcript updates
  useEffect(() => {
    if (transcript) {
      const command = VoiceCommandProcessor.parse(transcript);
      if (command) {
        setLastAction(`Executed: ${command.type}`);
        // Here we would actually trigger app-level navigation or state changes
        // Using a timeout to clear the message for a cleaner UI experience
        setTimeout(() => setLastAction(null), 3000);
        resetTranscript();
      }
    }
  }, [transcript, resetTranscript]);

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
      {/* Visual Feedback for Voice Activity */}
      {(transcript || interimTranscript || lastAction) && (
        <div className="bg-slate-900/90 text-white p-4 rounded-xl shadow-2xl border border-white/10 max-w-xs animate-in fade-in slide-in-from-bottom-5">
          {lastAction && (
             <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                <CheckCircle size={16} /> {lastAction}
             </div>
          )}
          
          <div className="text-sm text-slate-400 mb-1 flex items-center gap-1">
             <Command size={14} /> Hearing:
          </div>
          
          <p className="text-slate-200">
             {transcript} <span className="text-slate-500 italic">{interimTranscript}</span>
          </p>
        </div>
      )}

      {/* Voice Control Button Group */}
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-lg">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`p-3 rounded-full transition-all duration-300 transform active:scale-90 ${
            isListening 
              ? 'bg-rose-500 text-white animate-pulse' 
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
          title={isListening ? 'Stop Listening' : 'Voice Commands (Ctrl+Shift+V)'}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {transcript && (
           <button
             onClick={resetTranscript}
             className="p-3 bg-white/5 text-white/70 hover:text-white rounded-full hover:bg-white/20 transition-all"
             title="Clear Transcript"
           >
             <RefreshCcw size={20} />
           </button>
        )}
      </div>

      {error && (
         <div className="bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full text-xs flex items-center gap-1 border border-rose-500/30">
            <XCircle size={12} /> {error}
         </div>
      )}
    </div>
  );
};
