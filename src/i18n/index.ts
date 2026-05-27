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
  // Resolve initial language synchronously so the first render matches what
  // the user expects. Using i18next-browser-languagedetector asynchronously
  // caused a visible flash where the page mounted in English and then
  // re-rendered in the stored language.
  let initialLng = "en";
  if (isBrowser) {
    try {
      const supported = SUPPORTED_LANGUAGES.map((l) => l.code) as string[];
      const stored = window.localStorage.getItem("pnet-lang");
      if (stored && supported.includes(stored)) {
        initialLng = stored;
      } else {
        const nav = (window.navigator.language || "en").slice(0, 2);
        if (supported.includes(nav)) initialLng = nav;
      }
    } catch {
      // ignore – fall back to "en"
    }
  }

  i18n.use(initReactI18next).init({
    resources,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    lng: initialLng,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    initImmediate: false,
  });

  if (isBrowser) {
    i18n.on("languageChanged", (lng) => {
      try {
        window.localStorage.setItem("pnet-lang", lng);
      } catch {
        // ignore
      }
    });
  }
}

export default i18n;
