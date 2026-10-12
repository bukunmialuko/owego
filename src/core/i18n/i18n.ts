import { getLocales } from 'react-native-localize';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

const resources = { en: { translation: en } } as const;

const FALLBACK_LANGUAGE = 'en';

function resolveDeviceLanguage(): string {
  const languageCode = getLocales()[0]?.languageCode;

  return languageCode != null && languageCode in resources ? languageCode : FALLBACK_LANGUAGE;
}

export type I18nInstance = ReturnType<typeof createI18n>;

export function createI18n(language: string = resolveDeviceLanguage()) {
  const instance = i18n.createInstance();

  void instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  return instance;
}
