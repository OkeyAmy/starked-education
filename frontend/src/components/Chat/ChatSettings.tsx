import React, { useState } from 'react';
import { X, Trash2, Globe, Volume2 } from 'lucide-react';

interface ChatSettingsProps {
  language: string;
  onLanguageChange: (language: string) => void;
  onClose: () => void;
  onClearHistory: () => void;
  className?: string;
}

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ru', name: 'Русский' }
];

export const ChatSettings: React.FC<ChatSettingsProps> = ({
  language,
  onLanguageChange,
  onClose,
  onClearHistory,
  className = ''
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearHistory = () => {
    onClearHistory();
    setShowClearConfirm(false);
    onClose();
  };

  return (
    <div className={`p-4 border-b border-gray-200 bg-gray-50 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900">Chat Settings</h4>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
          title="Close settings"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Language Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe size={16} className="inline mr-2" />
            Language
          </label>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select your preferred language for AI responses
          </p>
        </div>

        {/* Voice Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Volume2 size={16} className="inline mr-2" />
            Voice Settings
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Speech Rate</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                defaultValue="1"
                className="w-24"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Voice Pitch</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                defaultValue="1"
                className="w-24"
              />
            </div>
          </div>
        </div>

        {/* Clear History */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Trash2 size={16} className="inline mr-2" />
            Chat History
          </label>
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear Chat History
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Are you sure you want to clear all chat history? This action cannot be undone.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Clear all messages in this conversation
          </p>
        </div>

        {/* About */}
        <div className="pt-4 border-t border-gray-200">
          <h5 className="text-sm font-medium text-gray-700 mb-2">About</h5>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• AI Learning Assistant v1.0</p>
            <p>• Powered by advanced language models</p>
            <p>• Context-aware responses for better learning</p>
            <p>• Voice interaction supported</p>
          </div>
        </div>
      </div>
    </div>
  );
};
