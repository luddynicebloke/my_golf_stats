import type { Component } from "solid-js";
import { createSignal } from "solid-js";

import UKflag from "../assets/uk_flag.png";
import FRflag from "../assets/fr_flag.png";

import { useTransContext } from "@mbarzda/solid-i18next";

import LanguageDetector from "i18next-browser-languagedetector";

const lng = new LanguageDetector();
// console.log(lng.detect());

const LanguageMenu: Component = () => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [t, i18n] = useTransContext();

  const [currentLanguage, setCurrentLanguage] = createSignal(lng.detect());
  const [flag, setFlag] = createSignal(UKflag);

  const handelChangeLanguage = () => {
    if (currentLanguage() === "fr") {
      setCurrentLanguage("en");
      i18n.changeLanguage("en");
    } else if (currentLanguage() === "en") {
      setCurrentLanguage("fr");
      i18n.changeLanguage("fr");
    }
    console.log("clicked");
  };

  return (
    <>
      <button
        onclick={handelChangeLanguage}
        class='text-xl mr-2 bg-neutral-700 border-0'
      >
        {currentLanguage() === "fr" ? (
          <img src={FRflag} alt='' width={24} />
        ) : (
          <img src={UKflag} alt='' width={24} />
        )}
      </button>
    </>
  );
};

export default LanguageMenu;
