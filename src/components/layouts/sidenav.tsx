import { A } from "@solidjs/router";

import NavLinks from "./nav-links";
import LogoSG from "../../assets/logo.png";
import LanguageMenu from "../../i18n/Menu";
import { useTransContext } from "@mbarzda/solid-i18next";

import { useAuth } from "../../context/AuthProvider";

export default function Sidenav() {
  const { user, profile } = useAuth();
  const [t] = useTransContext();
  const categoryLabel = () => {
    const category = profile()?.category;

    if (!category?.code) {
      return category?.name ?? "";
    }

    return t(`categories.${category.code}`, {
      defaultValue: category.name,
    });
  };

  return (
    <div class='flex h-full flex-col px-3 py-4 md:px-4 md:py-5'>
      <A
        href='/dashboard'
        class='mb-3 flex items-end gap-3 rounded-2xl border border-slate-200 bg-linear-to-r from-cyan-950 via-slate-900 to-emerald-950 p-4 text-white shadow-sm'
      >
        <div class='w-20 sm:w-24 text-white md:w-24'>
          <img src={LogoSG} alt={t("common.logoAlt")} />
        </div>
        <div>
          <p class='font-grotesk text-[11px] uppercase tracking-[0.2em] text-cyan-300'>
            Golf Stats
          </p>
          <p class='font-rubik text-lg font-semibold leading-tight'>
            Strokes Gained
          </p>
        </div>
      </A>

      <div class='mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2'>
        <div class='min-w-0'>
          <p class='font-grotesk text-xs font-semibold uppercase tracking-[0.12em] text-slate-500'>
            {t("layout.signedIn")}
          </p>
          <div class='flex min-w-0 sm:inline'>
            <p class='truncate font-grotesk text-sm text-slate-700'>
              {profile()?.user_name || user()?.email || t("layout.unknownUser")}
            </p>
            <p class='truncate font-grotesk text-sm text-slate-700'>
              {categoryLabel() ? `(${categoryLabel()})` : ""}
            </p>
          </div>
        </div>
        <div class='shrink-0'>
          <LanguageMenu />
        </div>
      </div>

      <div class='flex flex-row justify-between gap-2 md:flex-col'>
        <NavLinks />
        <div class='hidden h-auto w-full grow rounded-xl border border-slate-200 bg-slate-50 md:block'></div>
      </div>
    </div>
  );
}
