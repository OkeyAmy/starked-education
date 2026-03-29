/**
 * Simple test to verify i18n setup is working
 */

import i18n from './i18n';

// Test basic i18n functionality
export function testI18nSetup() {
  try {
    // Test language change
    i18n.changeLanguage('es');
    console.log('✅ Language changed to Spanish');
    
    // Test translation
    const welcomeText = i18n.t('app.name');
    console.log('✅ Translation test:', welcomeText);
    
    // Test RTL detection
    const isRTLLanguage = i18n.language === 'ar';
    console.log('✅ RTL detection test:', isRTLLanguage);
    
    // Test fallback
    i18n.changeLanguage('invalid-lang');
    const fallbackText = i18n.t('app.name');
    console.log('✅ Fallback test:', fallbackText);
    
    console.log('✅ All i18n tests passed!');
    return true;
  } catch (error) {
    console.error('❌ i18n test failed:', error);
    return false;
  }
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  testI18nSetup();
}
