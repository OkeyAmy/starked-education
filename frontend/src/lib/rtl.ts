/**
 * RTL (Right-to-Left) language support utilities
 */

export const RTL_LANGUAGES = [
  'ar',    // Arabic
  'he',    // Hebrew
  'fa',    // Persian/Farsi
  'ur',    // Urdu
  'ps',    // Pashto
  'yi',    // Yiddish
  'ckb',   // Sorani Kurdish
  'sd',    // Sindhi
  'syr',   // Syriac
  'th',    // Thai (can be written RTL in some contexts)
  'dv',    // Divehi/Maldivian
  'men',   // Mandinka
  'ha',    // Hausa (traditional Ajami script)
  'ku',    // Kurdish (Arabic script)
];

export const LTR_LANGUAGES = [
  'en',    // English
  'es',    // Spanish
  'fr',    // French
  'de',    // German
  'it',    // Italian
  'pt',    // Portuguese
  'ru',    // Russian
  'zh',    // Chinese
  'ja',    // Japanese
  'ko',    // Korean
  'hi',    // Hindi
  'vi',    // Vietnamese
  'id',    // Indonesian
  'ms',    // Malay
  'tr',    // Turkish
  'pl',    // Polish
  'nl',    // Dutch
  'sv',    // Swedish
  'da',    // Danish
  'no',    // Norwegian
  'fi',    // Finnish
  'el',    // Greek
  'cs',    // Czech
  'sk',    // Slovak
  'hu',    // Hungarian
  'ro',    // Romanian
  'bg',    // Bulgarian
  'hr',    // Croatian
  'sr',    // Serbian
  'sl',    // Slovenian
  'et',    // Estonian
  'lv',    // Latvian
  'lt',    // Lithuanian
  'uk',    // Ukrainian
  'be',    // Belarusian
  'mk',    // Macedonian
  'sq',    // Albanian
  'mt',    // Maltese
  'ga',    // Irish
  'cy',    // Welsh
  'eu',    // Basque
  'ca',    // Catalan
  'gl',    // Galician
  'is',    // Icelandic
];

/**
 * Check if a language is RTL (Right-to-Left)
 * @param languageCode - ISO language code (e.g., 'ar', 'he')
 * @returns boolean indicating if the language is RTL
 */
export function isRTL(languageCode: string): boolean {
  if (!languageCode) return false;
  
  // Handle language-region codes (e.g., 'ar-SA', 'zh-CN')
  const lang = languageCode.split('-')[0].toLowerCase();
  
  return RTL_LANGUAGES.includes(lang);
}

/**
 * Check if a language is LTR (Left-to-Right)
 * @param languageCode - ISO language code (e.g., 'en', 'fr')
 * @returns boolean indicating if the language is LTR
 */
export function isLTR(languageCode: string): boolean {
  return !isRTL(languageCode);
}

/**
 * Get the text direction for a language
 * @param languageCode - ISO language code
 * @returns 'rtl' or 'ltr'
 */
export function getTextDirection(languageCode: string): 'rtl' | 'ltr' {
  return isRTL(languageCode) ? 'rtl' : 'ltr';
}

/**
 * Get the appropriate text alignment for a language
 * @param languageCode - ISO language code
 * @returns CSS text alignment value
 */
export function getTextAlign(languageCode: string): 'left' | 'right' {
  return isRTL(languageCode) ? 'right' : 'left';
}

/**
 * Get the opposite text direction
 * @param languageCode - ISO language code
 * @returns opposite text direction
 */
export function getOppositeDirection(languageCode: string): 'rtl' | 'ltr' {
  return isRTL(languageCode) ? 'ltr' : 'rtl';
}

/**
 * Get CSS class names for RTL/LTR support
 * @param languageCode - ISO language code
 * @returns object with CSS classes
 */
export function getDirectionClasses(languageCode: string) {
  const isRtl = isRTL(languageCode);
  return {
    direction: isRtl ? 'rtl' : 'ltr',
    textAlign: isRtl ? 'text-right' : 'text-left',
    float: isRtl ? 'float-right' : 'float-left',
    marginStart: isRtl ? 'ms-auto' : 'me-auto',
    marginEnd: isRtl ? 'me-auto' : 'ms-auto',
    paddingStart: isRtl ? 'ps-4' : 'pe-4',
    paddingEnd: isRtl ? 'pe-4' : 'ps-4',
    borderStart: isRtl ? 'border-s' : 'border-e',
    borderEnd: isRtl ? 'border-e' : 'border-s',
  };
}

/**
 * Get appropriate font family for a language
 * @param languageCode - ISO language code
 * @returns CSS font family string
 */
export function getFontFamily(languageCode: string): string {
  const lang = languageCode.split('-')[0].toLowerCase();
  
  switch (lang) {
    case 'ar':
      return '"Noto Sans Arabic", "Tahoma", "Arial", sans-serif';
    case 'he':
      return '"Noto Sans Hebrew", "Arial", sans-serif';
    case 'fa':
      return '"Noto Sans Persian", "Tahoma", sans-serif';
    case 'ur':
      return '"Noto Sans Urdu", "Arial", sans-serif';
    case 'th':
      return '"Noto Sans Thai", "Tahoma", sans-serif';
    case 'zh':
      return '"Noto Sans SC", "Microsoft YaHei", sans-serif';
    case 'ja':
      return '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
    case 'ko':
      return '"Noto Sans KR", "Malgun Gothic", sans-serif';
    case 'hi':
    case 'mr':
    case 'ne':
    case 'sa':
      return '"Noto Sans Devanagari", sans-serif';
    case 'bn':
      return '"Noto Sans Bengali", sans-serif';
    case 'ta':
      return '"Noto Sans Tamil", sans-serif';
    case 'te':
      return '"Noto Sans Telugu", sans-serif';
    case 'ml':
      return '"Noto Sans Malayalam", sans-serif';
    case 'gu':
      return '"Noto Sans Gujarati", sans-serif';
    case 'kn':
      return '"Noto Sans Kannada", sans-serif';
    case 'or':
      return '"Noto Sans Oriya", sans-serif';
    case 'pa':
      return '"Noto Sans Gurmukhi", sans-serif';
    case 'as':
      return '"Noto Sans Assamese", sans-serif';
    case 'ru':
    case 'uk':
    case 'bg':
    case 'sr':
    case 'mk':
      return '"Noto Sans Cyrillic", sans-serif';
    case 'el':
      return '"Noto Sans Greek", sans-serif';
    case 'hy':
      return '"Noto Sans Armenian", sans-serif';
    case 'ka':
      return '"Noto Sans Georgian", sans-serif';
    case 'am':
    case 'ti':
      return '"Noto Sans Ethiopic", sans-serif';
    case 'km':
      return '"Noto Sans Khmer", sans-serif';
    case 'lo':
      return '"Noto Sans Lao", sans-serif';
    case 'my':
      return '"Noto Sans Myanmar", sans-serif';
    case 'si':
      return '"Noto Sans Sinhala", sans-serif';
    case 'dz':
      return '"Noto Sans Tibetan", sans-serif';
    case 'bo':
      return '"Noto Sans Tibetan", sans-serif';
    case 'mn':
      return '"Noto Sans Mongolian", sans-serif';
    default:
      return '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif';
  }
}

/**
 * Get language-specific number formatting options
 * @param languageCode - ISO language code
 * @returns Intl.NumberFormatOptions
 */
export function getNumberFormatOptions(languageCode: string): Intl.NumberFormatOptions {
  const lang = languageCode.split('-')[0].toLowerCase();
  
  switch (lang) {
    case 'ar':
    case 'fa':
    case 'ur':
      return {
        useGrouping: true,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      };
    case 'zh':
    case 'ja':
    case 'ko':
      return {
        useGrouping: true,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      };
    default:
      return {
        useGrouping: true,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      };
  }
}

/**
 * Get language-specific date formatting options
 * @param languageCode - ISO language code
 * @returns Intl.DateTimeFormatOptions
 */
export function getDateFormatOptions(languageCode: string): Intl.DateTimeFormatOptions {
  const lang = languageCode.split('-')[0].toLowerCase();
  const isRtl = isRTL(languageCode);
  
  const baseOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  if (isRtl) {
    return {
      ...baseOptions,
      calendar: 'islamic',
      numberingSystem: 'arab',
    };
  }
  
  switch (lang) {
    case 'zh':
    case 'ja':
    case 'ko':
      return {
        ...baseOptions,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      };
    case 'th':
      return {
        ...baseOptions,
        calendar: 'buddhist',
      };
    default:
      return baseOptions;
  }
}
