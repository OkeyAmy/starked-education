'use client';

import React, { useState, useEffect } from 'react';
import { Mic, CheckCircle2, AlertCircle, Play, Info } from 'lucide-react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { VoiceCommandProcessor } from '../services/voiceCommandProcessor';

interface LanguagePractitionerProps {
  targetPhrase?: string;
}

export const LanguagePractitioner: React.FC<LanguagePractitionerProps> = ({ 
  targetPhrase = "Bonjour tout le monde" 
}) => {
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceRecognition('fr-FR');
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // Evaluate pronunciation in real-time as user speaks
  useEffect(() => {
    if (transcript) {
      const score = VoiceCommandProcessor.evaluatePronunciation(transcript, targetPhrase);
      setAccuracy(score);
      // Automatically stop if we hit 100% accuracy or user pauses
      if (score === 100) {
        stopListening();
        setAccuracy(100);
      }
    }
  }, [transcript, targetPhrase, stopListening]);

  return (
    <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl shadow-xl max-w-lg mx-auto overflow-hidden">
      <div className="flex items-center gap-2 mb-6 text-slate-400">
         <Info size={18} />
         <h2 className="text-sm font-semibold uppercase tracking-wider">Pronunciation Practice</h2>
      </div>

      <div className="p-8 bg-black/40 border border-white/5 rounded-xl mb-6 relative">
         <p className="text-3xl text-white font-medium mb-2 tracking-tight">
            {targetPhrase}
         </p>
         <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
            <Play size={14} fill="currentColor" /> Listen to Native Audio
         </button>
      </div>

      <div className="space-y-4">
         <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
               <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Your Speech</p>
               <p className={`text-xl font-medium ${transcript ? 'text-white' : 'text-slate-600 italic'}`}>
                  {transcript || (isListening ? 'Listening...' : 'Ready to practice?')}
               </p>
            </div>
            <button 
               onClick={isListening ? stopListening : startListening}
               className={`p-4 rounded-full transition-all duration-300 ${
                  isListening 
                  ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/50' 
                  : 'bg-white/10 text-white hover:bg-white/20'
               }`}
            >
               <Mic size={24} />
            </button>
         </div>

         {accuracy !== null && (
            <div className={`flex items-center justify-between p-4 rounded-lg transform transition-all duration-500 ${
               accuracy > 90 
               ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
               : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
               <div className="flex items-center gap-3">
                  {accuracy > 90 ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  <div>
                     <p className="text-sm font-bold opacity-80 uppercase">Matching Accuracy</p>
                     <p className="text-2xl font-black">{accuracy}%</p>
                  </div>
               </div>
               
               {accuracy < 90 && (
                  <button 
                    onClick={() => { resetTranscript(); startListening(); }}
                    className="text-xs font-bold underline hover:no-underline"
                  >
                     Try again
                  </button>
               )}
            </div>
         )}
      </div>
    </div>
  );
};
