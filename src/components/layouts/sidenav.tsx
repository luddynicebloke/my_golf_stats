import { A } from "@solidjs/router";

import NavLinks from "./nav-links";
import LogoSG from "../../assets/logo.png";

import { useAuth } from "../../context/AuthProvider";

export default function Sidenav() {
  const { user, profile } = useAuth();

  return (
    <div class='flex h-full flex-col px-3 py-4 md:px-4 md:py-5'>
      <A
        href='/dashboard'
        class='mb-3 flex items-end gap-3 rounded-2xl border border-slate-200 bg-linear-to-r from-cyan-950 via-slate-900 to-emerald-950 p-4 text-white shadow-sm'
      >
        <div class='w-20 sm:w-24 text-white md:w-24'>
          <img src={LogoSG} alt='SG Calculater Logo' />
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

      <div class='mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2'>
        <p class='font-grotesk text-xs font-semibold uppercase tracking-[0.12em] text-slate-500'>
          Signed in as
        </p>
        <p class='truncate font-grotesk text-sm text-slate-700'>
          {profile()?.user_name || user()?.email || "Unknown user"}
        </p>
      </div>

      <div class='flex flex-row justify-between gap-2 md:flex-col'>
        <NavLinks />
        <div class='hidden h-auto w-full grow rounded-xl border border-slate-200 bg-slate-50 md:block'></div>
      </div>
    </div>
  );
}
