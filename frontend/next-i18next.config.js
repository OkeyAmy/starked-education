module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: [
      'en',
      'es',
      'fr',
      'de',
      'zh',
      'ja',
      'ko',
      'ar'
    ],
    localeDetection: true,
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  serializeConfig: false,
  use: [
    require('i18next-fs-backend'),
    require('i18next-http-middleware'),
  ],
  ns: ['common', 'navigation', 'courses', 'profile', 'admin', 'errors', 'validation'],
  defaultNS: 'common',
  fallbackLng: {
    default: ['en'],
    'ar': ['ar', 'en'],
    'zh': ['zh', 'en'],
    'ja': ['ja', 'en'],
    'ko': ['ko', 'en'],
    'es': ['es', 'en'],
    'fr': ['fr', 'en'],
    'de': ['de', 'en']
  },
  debug: process.env.NODE_ENV === 'development',
  saveMissing: process.env.NODE_ENV === 'development',
  strictMode: true,
  react: {
    useSuspense: false,
  },
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
  }
};
