import { createSignal, Match, Switch } from "solid-js";

import Courses from "../components/admin/courses";
import Users from "../components/admin/users";
import Stokes_expectation from "../components/admin/stokes_expectation";
import { A } from "@solidjs/router";
import { useTransContext } from "@mbarzda/solid-i18next";

type View = "courses" | "add_course" | "users" | "other";

const AdminPanel = () => {
  const [t] = useTransContext();
  const [view, setView] = createSignal<View>("courses");
  const navItems: { key: View; labelKey: string; descriptionKey: string }[] = [
    {
      key: "courses",
      labelKey: "admin.nav.courses",
      descriptionKey: "admin.nav.coursesDescription",
    },
    {
      key: "users",
      labelKey: "admin.nav.users",
      descriptionKey: "admin.nav.usersDescription",
    },
    {
      key: "other",
      labelKey: "admin.nav.strokesGained",
      descriptionKey: "admin.nav.strokesGainedDescription",
    },
  ];

  return (
    <div class='mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
      <div class='rounded-3xl border border-slate-200 bg-linear-to-r from-cyan-950 via-slate-900 to-emerald-950 px-6 py-8 text-slate-100 shadow-xl'>
        <p class='font-grotesk text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300'>
          {t("admin.eyebrow")}
        </p>
        <div class='mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div>
            <h1 class='font-rubik text-3xl font-semibold tracking-tight md:text-4xl'>
              {t("admin.title")}
            </h1>
            <p class='mt-2 max-w-2xl font-grotesk text-sm text-slate-300 md:text-base'>
              {t("admin.description")}
            </p>
          </div>
          <A
            href='/dashboard'
            class='inline-flex w-max items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 font-grotesk text-sm font-semibold text-white transition hover:bg-white/20'
          >
            {t("scoreEntry.backToDashboard")}
          </A>
        </div>
      </div>

      <div class='mt-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm'>
        <div class='grid gap-2 md:grid-cols-3'>
          {navItems.map((item) => (
            <button
              onClick={() => setView(item.key)}
              class={`w-full rounded-xl border px-4 py-3 text-left transition ${
                view() === item.key
                  ? "border-cyan-300 bg-cyan-50 text-cyan-900 shadow-sm"
                  : "border-transparent bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white"
              }`}
            >
              <p class='font-rubik text-sm font-semibold'>
                {t(item.labelKey)}
              </p>
              <p class='mt-0.5 font-grotesk text-xs opacity-80 ml-5'>
                {t(item.descriptionKey)}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div class='mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <Switch>
          <Match when={view() === "courses"}>
            <Courses />
          </Match>
          <Match when={view() === "add_course"}>
            <div class='font-grotesk text-slate-600'>
              {t("admin.addCourse")}
            </div>
          </Match>
          <Match when={view() === "users"}>
            <Users />
          </Match>
          <Match when={view() === "other"}>
            <Stokes_expectation />
          </Match>
        </Switch>
      </div>
    </div>
  );
};

export default AdminPanel;
