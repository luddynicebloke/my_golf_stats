import { A } from "@solidjs/router";
import { ImArrowRight2 } from "solid-icons/im";
import ImageL from "../assets/background-text.jpg";
import ImageM from "../assets/background_m_text.jpg";

import { useTransContext } from "@mbarzda/solid-i18next";
import LanguageMenu from "../i18n/Menu";

export default function Welcome() {
  const [t] = useTransContext();
  return (
    <div class='relative flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 px-4 py-12 text-center dark:from-gray-950 dark:to-black md:px-8 lg:px-12'>
      {/* Subtle radial gradient overlay */}
      <div class='absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-transparent via-white/30 to-transparent dark:via-black/30' />
      <div class='absolute right-4 top-4 z-20'>
        <LanguageMenu />
      </div>

      <div class='relative z-10 flex w-full max-w-6xl flex-col items-center justify-center gap-8 md:flex-row md:gap-12 lg:gap-16'>
        {/* Text Content Section */}
        <div class='flex flex-col items-center text-center md:w-[45%] md:items-start md:text-left'>
          <h1 class='text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl md:text-7xl dark:text-gray-50'>
            {t("welcome")} <span class='text-emerald-700'>{t("sg")}</span>{" "}
          </h1>
          <p class='mt-6 text-xl text-gray-700 md:text-2xl dark:text-gray-300'>
            {t("desc")}
          </p>
          <div class='mt-10'>
            <A
              href='/dashboard'
              class='flex items-center gap-5 self-start rounded-lg bg-slate-800 dark:bg-emerald-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-900 hover:text-white md:text-base'
            >
              <span>{t("start")}</span> <ImArrowRight2 class='w-5 md:w-6' />
            </A>
          </div>
        </div>

        {/* Dashboard Screenshot Section - Optimized for larger display */}
        <div class='w-full 2xl:min-w-full'>
          <div class='relative w-full overflow-hidden rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-200 dark:border-gray-700'>
            <img
              src={ImageL}
              width={1600}
              height={900} // Adjust to match your image's actual aspect ratio
              alt={t("welcomeImages.desktopAlt")}
              class='hidden md:block w-full h-auto'
            />
            <img
              src={ImageM}
              width={560}
              height={620}
              alt={t("welcomeImages.mobileAlt")}
              class='block md:hidden w-full h-auto'
            />
          </div>
        </div>
      </div>
    </div>
  );
}
