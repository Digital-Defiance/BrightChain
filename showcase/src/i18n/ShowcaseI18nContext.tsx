import {
  ComponentStrings,
  CoreLanguageCode,
  LanguageCodes,
} from '@digitaldefiance/i18n-lib';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ShowcaseStringKey, ShowcaseStrings } from './showcaseStrings';
import { ShowcaseAmericanEnglishStrings } from './strings/englishUs';

// Lazy load other languages - returns partial translations that fall back to English
const languageLoaders: Record<
  CoreLanguageCode,
  () => Promise<{ default: Partial<ComponentStrings<ShowcaseStringKey>> }>
> = {
  [LanguageCodes.EN_US]: () =>
    Promise.resolve({ default: ShowcaseAmericanEnglishStrings }),
  [LanguageCodes.EN_GB]: () => import('./strings/englishUK'),
  [LanguageCodes.ES]: () => import('./strings/spanish'),
  [LanguageCodes.FR]: () => import('./strings/french'),
  [LanguageCodes.DE]: () => import('./strings/german'),
  [LanguageCodes.ZH_CN]: () => import('./strings/mandarin'),
  [LanguageCodes.JA]: () => import('./strings/japanese'),
  [LanguageCodes.UK]: () => import('./strings/ukrainian'),
};

export interface ShowcaseI18nContextValue {
  language: CoreLanguageCode;
  setLanguage: (lang: CoreLanguageCode) => void;
  t: (key: ShowcaseStringKey, params?: Record<string, string>) => string;
  isLoading: boolean;
}

const ShowcaseI18nContext = createContext<ShowcaseI18nContextValue | null>(
  null,
);

// Use the same storage key as brightchain-react for consistency
const STORAGE_KEY = 'languageCode';

function getInitialLanguage(): CoreLanguageCode {
  // Check localStorage first (shared with brightchain-react)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (
      stored &&
      Object.values(LanguageCodes).includes(stored as CoreLanguageCode)
    ) {
      return stored as CoreLanguageCode;
    }
  } catch {
    // localStorage may be unavailable
  }

  // Check browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('en-gb')) return LanguageCodes.EN_GB;
  if (browserLang.startsWith('en')) return LanguageCodes.EN_US;
  if (browserLang.startsWith('es')) return LanguageCodes.ES;
  if (browserLang.startsWith('fr')) return LanguageCodes.FR;
  if (browserLang.startsWith('de')) return LanguageCodes.DE;
  if (browserLang.startsWith('zh')) return LanguageCodes.ZH_CN;
  if (browserLang.startsWith('ja')) return LanguageCodes.JA;
  if (browserLang.startsWith('uk')) return LanguageCodes.UK;

  return LanguageCodes.EN_US;
}

export const ShowcaseI18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] =
    useState<CoreLanguageCode>(getInitialLanguage);
  const [strings, setStrings] = useState<
    Partial<ComponentStrings<ShowcaseStringKey>>
  >(ShowcaseAmericanEnglishStrings);
  const [isLoading, setIsLoading] = useState(false);

  const loadLanguage = useCallback(async (lang: CoreLanguageCode) => {
    setIsLoading(true);
    try {
      const loader = languageLoaders[lang];
      if (loader) {
        const module = await loader();
        setStrings(module.default);
      }
    } catch (error) {
      console.error(`Failed to load language ${lang}:`, error);
      // Fallback to English
      setStrings(ShowcaseAmericanEnglishStrings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLanguage(language);
  }, [language, loadLanguage]);

  const setLanguage = useCallback((lang: CoreLanguageCode) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage may be unavailable
    }
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: ShowcaseStringKey, params?: Record<string, string>): string => {
      let value = strings[key];
      if (value === undefined) {
        console.warn(`Missing translation for key: ${key}`);
        // Try to get from English as fallback
        value = ShowcaseAmericanEnglishStrings[key] ?? key;
      }
      if (params) {
        for (const [param, replacement] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), replacement);
        }
      }
      return value;
    },
    [strings],
  );

  return (
    <ShowcaseI18nContext.Provider
      value={{ language, setLanguage, t, isLoading }}
    >
      {children}
    </ShowcaseI18nContext.Provider>
  );
};

export function useShowcaseI18n(): ShowcaseI18nContextValue {
  const context = useContext(ShowcaseI18nContext);
  if (!context) {
    throw new Error(
      'useShowcaseI18n must be used within a ShowcaseI18nProvider',
    );
  }
  return context;
}

// Export supported languages for the language selector
export const supportedLanguages: Array<{
  code: CoreLanguageCode;
  labelKey: ShowcaseStringKey;
  nativeName: string;
}> = [
  {
    code: LanguageCodes.EN_US,
    labelKey: ShowcaseStrings.Lang_EN_US,
    nativeName: 'English (US)',
  },
  {
    code: LanguageCodes.EN_GB,
    labelKey: ShowcaseStrings.Lang_EN_GB,
    nativeName: 'English (UK)',
  },
  {
    code: LanguageCodes.ES,
    labelKey: ShowcaseStrings.Lang_ES,
    nativeName: 'Español',
  },
  {
    code: LanguageCodes.FR,
    labelKey: ShowcaseStrings.Lang_FR,
    nativeName: 'Français',
  },
  {
    code: LanguageCodes.DE,
    labelKey: ShowcaseStrings.Lang_DE,
    nativeName: 'Deutsch',
  },
  {
    code: LanguageCodes.ZH_CN,
    labelKey: ShowcaseStrings.Lang_ZH_CN,
    nativeName: '中文',
  },
  {
    code: LanguageCodes.JA,
    labelKey: ShowcaseStrings.Lang_JA,
    nativeName: '日本語',
  },
  {
    code: LanguageCodes.UK,
    labelKey: ShowcaseStrings.Lang_UK,
    nativeName: 'Українська',
  },
];
