import { TbLayoutDashboard } from "solid-icons/tb";
import { IoGolfOutline } from "solid-icons/io";
import { FaSolidGolfBallTee } from "solid-icons/fa";
import { ImStatsBars2 } from "solid-icons/im";
import { CgProfile } from "solid-icons/cg";
import { VsSignOut } from "solid-icons/vs";
import { Component, For, JSX } from "solid-js";
import { A, useNavigate } from "@solidjs/router";

import { useAuth } from "../../context/AuthProvider";

type NavLinkItem = {
  name: string;
  href: string;
  icon: Component<{ class?: string }>;
  isSignOut?: boolean;
};

export const links: NavLinkItem[] = [
  { name: "Home", href: "/dashboard", icon: TbLayoutDashboard },
  {
    name: "Start New Round",
    href: "/dashboard/new-round",
    icon: FaSolidGolfBallTee,
  },
  { name: "Rounds", href: "/dashboard/rounds", icon: IoGolfOutline },
  { name: "Statistics", href: "/dashboard/statistics", icon: ImStatsBars2 },
  { name: "Profile", href: "/dashboard/profile", icon: CgProfile },
  { name: "Sign Out", href: "/", icon: VsSignOut, isSignOut: true },
];

export default function NavLinks() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut: JSX.EventHandlerUnion<
    HTMLAnchorElement,
    MouseEvent
  > = async (e) => {
    e.preventDefault();
    await signOut();
    navigate("/signin", { replace: true });
  };

  return (
    <div class='flex flex-row gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible'>
      <For each={links}>
        {(link) => {
          const LinkIcon = link.icon;
          const baseClass = link.isSignOut
            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

          return (
            <A
              href={link.href}
              class={`inline-flex h-11 min-w-max items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition md:w-full ${baseClass}`}
              activeClass='!border-cyan-300 !bg-cyan-50 !text-cyan-800'
              end
              onClick={link.name === "Sign Out" ? handleSignOut : undefined}
            >
              <LinkIcon class='h-5 w-5' />
              <span class='font-grotesk whitespace-nowrap'>{link.name}</span>
            </A>
          );
        }}
      </For>
    </div>
  );
}
