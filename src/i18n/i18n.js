import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from './locales/en.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import te from './locales/te.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import ur from './locales/ur.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import or from './locales/or.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';
import as from './locales/as.json';
import mai from './locales/mai.json';
import sa from './locales/sa.json';
import ne from './locales/ne.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  te: { translation: te },
  mr: { translation: mr },
  ta: { translation: ta },
  ur: { translation: ur },
  gu: { translation: gu },
  kn: { translation: kn },
  or: { translation: or },
  ml: { translation: ml },
  pa: { translation: pa },
  as: { translation: as },
  mai: { translation: mai },
  sa: { translation: sa },
  ne: { translation: ne }
};

// Detect device language - this is synchronous with proper null checks
const deviceLocale = Localization.locale || Localization.locales?.[0] || 'en-US';
const deviceLanguage = typeof deviceLocale === 'string' ? deviceLocale.split('-')[0] : 'en';
const defaultLanguage = resources[deviceLanguage] ? deviceLanguage : 'en';

// Initialize i18n synchronously with default language
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // Disable suspense to avoid async issues
    },
  });

// Load saved language asynchronously after initialization
AsyncStorage.getItem('language').then((savedLanguage) => {
  if (savedLanguage && resources[savedLanguage] && savedLanguage !== i18n.language) {
    i18n.changeLanguage(savedLanguage);
  }
}).catch(err => {
  console.warn('Failed to load saved language:', err);
});

export const changeLanguage = async (languageCode) => {
  try {
    if (!resources[languageCode]) {
      throw new Error(`Language ${languageCode} is not supported`);
    }
    await AsyncStorage.setItem('language', languageCode);
    await i18n.changeLanguage(languageCode);
    return true;
  } catch (error) {
    console.error('Failed to change language:', error);
    throw error;
  }
};

export const getCurrentLanguage = () => i18n.language;

export const getSupportedLanguages = () => [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृत' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' }
];

export default i18n;
