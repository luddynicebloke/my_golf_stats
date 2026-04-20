import { createSignal } from "solid-js";
import UKflag from "../assets/uk_flag.png";
import FRflag from "../assets/fr_flag.png";
import { useTransContext } from "@mbarzda/solid-i18next";
import i18nInstance from "./index";

const normalizeLanguage = (language: string | undefined) =>
  language?.startsWith("fr") ? "fr" : "en";

export default function LanguageMenu() {
  const [t, i18n] = useTransContext();
  const [currentLanguage, setCurrentLanguage] = createSignal(
    normalizeLanguage(i18nInstance.language),
  );

  const changeLanguage = () => {
    const nextLanguage = currentLanguage() === "fr" ? "en" : "fr";
    setCurrentLanguage(nextLanguage);
    void i18n.changeLanguage(nextLanguage);
  };

  return (
    <button
      type='button'
      onClick={changeLanguage}
      class='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50'
      aria-label={t("language.switchTo", {
        language:
          currentLanguage() === "fr"
            ? t("language.english")
            : t("language.french"),
      })}
    >
      <img
        src={currentLanguage() === "fr" ? FRflag : UKflag}
        alt=''
        class='h-5 w-auto'
      />
      <span>{currentLanguage().toUpperCase()}</span>
    </button>
  );
}
