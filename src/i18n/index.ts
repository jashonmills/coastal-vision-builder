import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import hi from "./locales/hi.json";
import zh from "./locales/zh.json";
import fr from "./locales/fr.json";
import vi from "./locales/vi.json";
import ko from "./locales/ko.json";
import tl from "./locales/tl.json";
import ru from "./locales/ru.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "zh", label: "Mandarin Chinese", native: "中文" },
  { code: "fr", label: "French", native: "Français" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "tl", label: "Tagalog", native: "Tagalog" },
  { code: "ru", label: "Russian", native: "Русский" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const resources = {
  en: { translation: en },
  es: { translation: es },
  de: { translation: de },
  hi: { translation: hi },
  zh: { translation: zh },
  fr: { translation: fr },
  vi: { translation: vi },
  ko: { translation: ko },
  tl: { translation: tl },
  ru: { translation: ru },
};

if (!i18n.isInitialized) {
  const isBrowser = typeof window !== "undefined";
  const chain = i18n.use(initReactI18next);
  if (isBrowser) chain.use(LanguageDetector);

  chain.init({
    resources,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    lng: isBrowser ? undefined : "en",
    interpolation: { escapeValue: false },
    detection: isBrowser
      ? {
          order: ["localStorage", "navigator"],
          lookupLocalStorage: "pnet-lang",
          caches: ["localStorage"],
        }
      : undefined,
    react: { useSuspense: false },
  });
}

export default i18n;
