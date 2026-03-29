import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

export const SecurityWarning: React.FC = () => {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4 mb-6">
      <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
        <AlertTriangle size={20} />
      </div>
      <div className="flex-1">
        <h4 className="text-amber-900 font-bold text-sm mb-1">Stay Safe on StarkEd</h4>
        <p className="text-amber-800 text-xs leading-relaxed">
          StarkEd will never ask for your secret key or recovery phrase. 
          Always ensure you are on the official <span className="font-bold">starked.edu</span> domain 
          before signing any transaction.
        </p>
        <div className="mt-2 flex gap-3">
          <a 
            href="https://www.stellar.org/lumens/safety-guide" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-amber-700 hover:text-amber-900 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
          >
            Learn More <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
};
