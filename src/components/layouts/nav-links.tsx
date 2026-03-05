import { TbLayoutDashboard } from "solid-icons/tb";
import { IoGolfOutline } from "solid-icons/io";
import { FaSolidGolfBallTee } from "solid-icons/fa";
import { ImStatsBars2 } from "solid-icons/im";
import { CgProfile } from "solid-icons/cg";
import { VsSignOut } from "solid-icons/vs";
import { For } from "solid-js";
import { A } from "@solidjs/router";

import { useAuth } from "../../context/AuthProvider";

export const links = [
  { name: "Home", href: "/dashboard", icon: TbLayoutDashboard },
  {
    name: "Start New Round",
    href: "/dashboard/new-round",
    icon: FaSolidGolfBallTee,
  },
  { name: "Rounds", href: "/dashboard/rounds", icon: IoGolfOutline },
  { name: "Statistics", href: "/dashboard/statistics", icon: ImStatsBars2 },
  { name: "Profile", href: "/dashboard/profile", icon: CgProfile },
  { name: "Sign Out", href: "/", icon: VsSignOut },
];

export default function NavLinks() {
  const { signOut } = useAuth();

  return (
    <For each={links}>
      {(link) => {
        const LinkIcon = link.icon;
        return (
          <A
            href={link.href}
            class='flex h-12 grow items-center justify-center gap-2 rounded-md bg-gray-50 dark:bg-slate-800 p-3 text-sm font-medium hover:bg-emerald-900/50 md:flex-none md:justify-start md:p-2 md:px-3'
            activeClass='border'
            end
            onClick={link.name === "Sign Out" ? signOut : undefined}
          >
            <LinkIcon class=' w-6' />
            <p class='hidden md:block'>{link.name}</p>
          </A>
        );
      }}
    </For>
  );
}
