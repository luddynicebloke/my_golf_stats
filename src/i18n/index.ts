import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en/common.json";
import fr from "./locales/fr/common.json";

i18n.use(LanguageDetector).init({
  fallbackLng: "en",
  supportedLngs: ["en", "fr"],
  debug: false,
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  detection: {
    // Detection order: checks in this order until one works
    order: ["localStorage", "cookie", "navigator", "htmlTag"],
    // Where to store the detected language
    caches: ["localStorage", "cookie"],
  },
  interpolation: {
    escapeValue: false, // Solid already escapes
  },
});

export default i18n;
