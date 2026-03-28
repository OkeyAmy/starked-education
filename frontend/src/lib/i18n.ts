import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { isRTL } from './rtl';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false,
      format: function(value, format, lng) {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        if (format === 'currency') {
          return new Intl.NumberFormat(lng, { 
            style: 'currency', 
            currency: 'USD' 
          }).format(value);
        }
        if (format === 'date') {
          return new Intl.DateTimeFormat(lng).format(new Date(value));
        }
        if (format === 'datetime') {
          return new Intl.DateTimeFormat(lng, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(value));
        }
        if (format === 'relativetime') {
          const rtf = new Intl.RelativeTimeFormat(lng, { numeric: 'auto' });
          const diff = Date.now() - new Date(value).getTime();
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          return rtf.format(-days, 'day');
        }
        return value;
      }
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    ns: ['common', 'navigation', 'courses', 'profile', 'admin', 'errors', 'validation'],
    defaultNS: 'common',

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'span'],
    },

    pluralSeparator: '_',
    contextSeparator: '_',

    returnEmptyString: false,
    returnNull: false,
    returnObjects: false,

    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: process.env.NODE_ENV === 'development' ? (lng, ns, key) => {
      console.warn(`Missing translation key: ${key} for language: ${lng} in namespace: ${ns}`);
    } : undefined,

    postProcess: ['defaultValuePostProcessor'],

    load: 'languageOnly',
    preload: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ar'],

    simplifyPluralSuffix: true,
  });

// RTL language detection and document direction setup
i18n.on('languageChanged', (lng) => {
  const isRTLDirection = isRTL(lng);
  document.documentElement.dir = isRTLDirection ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  
  // Update CSS classes for RTL/LTR
  document.body.classList.toggle('rtl', isRTLDirection);
  document.body.classList.toggle('ltr', !isRTLDirection);
  
  // Update font family for RTL languages
  if (isRTLDirection) {
    document.body.style.fontFamily = '"Noto Sans Arabic", "Tahoma", "Arial", sans-serif';
  } else {
    document.body.style.fontFamily = '';
  }
});

export default i18n;
