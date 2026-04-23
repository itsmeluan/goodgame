import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { enUS } from "@/i18n/locales/en-US";
import { ptBR } from "@/i18n/locales/pt-BR";

export type SupportedLocale = "pt-BR" | "en-US";
export type LanguagePreference = "system" | SupportedLocale;
export type TranslationKey = keyof typeof ptBR;

type TranslationParams = Record<string, string | number | null | undefined>;

type I18nContextValue = {
  locale: SupportedLocale;
  preference: LanguagePreference;
  setLanguagePreference: (preference: LanguagePreference) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const LANGUAGE_PREFERENCE_KEY = "good-game:language-preference";

const dictionaries = {
  "pt-BR": ptBR,
  "en-US": enUS,
} as const;

const I18nContext = createContext<I18nContextValue | null>(null);

let activeLocale: SupportedLocale = resolveDeviceLocale();

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<LanguagePreference>("system");
  const [systemLocale, setSystemLocale] = useState<SupportedLocale>(() => resolveDeviceLocale());

  const locale = preference === "system" ? systemLocale : preference;
  activeLocale = locale;

  useEffect(() => {
    let mounted = true;

    setSystemLocale(resolveDeviceLocale());

    void AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY)
      .then((storedPreference) => {
        if (!mounted || !isLanguagePreference(storedPreference)) {
          return;
        }

        setPreference(storedPreference);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguagePreference = useCallback((nextPreference: LanguagePreference) => {
    setPreference(nextPreference);
    void AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, nextPreference).catch(() => {});
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      preference,
      setLanguagePreference,
      t: (key, params) => translateForLocale(locale, key, params),
    }),
    [locale, preference, setLanguagePreference]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation must be used inside I18nProvider");
  }

  return context;
}

export function getCurrentLocale() {
  return activeLocale;
}

export function translate(key: TranslationKey, params?: TranslationParams) {
  return translateForLocale(activeLocale, key, params);
}

export function resolveDeviceLocale(): SupportedLocale {
  const languageTag = Localization.getLocales()[0]?.languageTag.toLowerCase() ?? "";
  const languageCode = Localization.getLocales()[0]?.languageCode?.toLowerCase() ?? "";

  if (languageTag.startsWith("pt") || languageCode === "pt") {
    return "pt-BR";
  }

  return "en-US";
}

function translateForLocale(
  locale: SupportedLocale,
  key: TranslationKey,
  params?: TranslationParams
) {
  const template = dictionaries[locale][key] ?? dictionaries["pt-BR"][key] ?? key;

  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, paramKey: string) => {
    const value = params[paramKey];
    return value === null || value === undefined ? match : String(value);
  });
}

function isLanguagePreference(value: string | null): value is LanguagePreference {
  return value === "system" || value === "pt-BR" || value === "en-US";
}
