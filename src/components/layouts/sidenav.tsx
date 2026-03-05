import { createSignal } from "solid-js";
import { A } from "@solidjs/router";

import { BsPower } from "solid-icons/bs";
import NavLinks from "./nav-links";
import LogoSG from "../../assets/logo.png";

import { useAuth } from "../../context/AuthProvider";

export default function sidenav() {
  const { user } = useAuth();
  return (
    <div class='flex h-full flex-col px-3 py-4 md:px-2'>
      <A
        href='/dashboard'
        class='mb-2 flex h-36 items-end justify-center rounded-md bg-emerald-950 p-4 md:h-40'
      >
        <div class='w-32 sm:w-32 text-white md:w-40'>
          <img src={LogoSG} alt='SG Calculater Logo' />
        </div>
        Strokes Gained
      </A>
      <span>{user()?.email}</span>
      <div class='flex  flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2'>
        <NavLinks />
        <div class='hidden h-auto w-full grow rounded-md bg-gray-50 dark:bg-slate-800 md:block'></div>
      </div>
    </div>
  );
}
