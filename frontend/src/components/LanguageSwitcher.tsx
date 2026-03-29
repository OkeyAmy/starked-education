'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { isRTL, getTextDirection, getFontFamily } from '../lib/rtl';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
];

type LanguageSwitcherProps = {
  variant?: 'dropdown' | 'grid' | 'compact';
  showFlag?: boolean;
  showNativeName?: boolean;
  className?: string;
};

export function LanguageSwitcher({ 
  variant = 'dropdown', 
  showFlag = true, 
  showNativeName = true,
  className = ''
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);

  useEffect(() => {
    const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];
    setSelectedLanguage(currentLang);
  }, [i18n.language]);

  const handleLanguageChange = (language: Language) => {
    i18n.changeLanguage(language.code);
    setIsOpen(false);
    setSearchTerm('');
    
    // Update document direction and font
    const direction = getTextDirection(language.code);
    const fontFamily = getFontFamily(language.code);
    
    document.documentElement.dir = direction;
    document.documentElement.lang = language.code;
    document.body.style.fontFamily = fontFamily;
    
    // Update CSS classes
    document.body.classList.toggle('rtl', isRTL(language.code));
    document.body.classList.toggle('ltr', !isRTL(language.code));
    
    // Store preference
    localStorage.setItem('i18nextLng', language.code);
  };

  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="Select language"
        >
          <Globe className="h-4 w-4" />
          {selectedLanguage?.code.toUpperCase()}
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="max-h-64 overflow-y-auto">
              {filteredLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  {showFlag && <span>{language.flag}</span>}
                  <span className="font-medium">{language.code.toUpperCase()}</span>
                  {selectedLanguage?.code === language.code && (
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Select Your Language
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose your preferred language for the best experience
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredLanguages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language)}
              className={`
                relative p-3 rounded-lg border-2 transition-all duration-200 text-center
                ${selectedLanguage?.code === language.code
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              {showFlag && (
                <div className="text-2xl mb-1">{language.flag}</div>
              )}
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {showNativeName ? language.nativeName : language.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {language.code.toUpperCase()}
              </div>
              {selectedLanguage?.code === language.code && (
                <div className="absolute top-1 right-1">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="Select language"
      >
        <Globe className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        {showFlag && selectedLanguage && (
          <span className="text-lg">{selectedLanguage.flag}</span>
        )}
        <span className="font-medium text-gray-900 dark:text-white">
          {showNativeName && selectedLanguage ? selectedLanguage.nativeName : selectedLanguage?.name}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <input
                type="text"
                placeholder="Search languages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {filteredLanguages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language)}
                className={`
                  w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                  ${selectedLanguage?.code === language.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {showFlag && <span className="text-lg">{language.flag}</span>}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {language.name}
                      </div>
                      {showNativeName && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {language.nativeName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {language.code.toUpperCase()}
                    </span>
                    {selectedLanguage?.code === language.code && (
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
