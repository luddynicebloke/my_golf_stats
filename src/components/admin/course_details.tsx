import { createSignal, Show } from "solid-js";
import { TCourse } from "../../lib/definitions";

import LoadingCss from "../LoadingCss";
import { A } from "@solidjs/router";
import { useTransContext } from "@mbarzda/solid-i18next";
import { supabase } from "../../supabase/client";
import { useBlurSave } from "../../hooks/useBlurSave";

const Course_details = (props: {
  course: TCourse | undefined;
  onUpdated: () => Promise<unknown>;
}) => {
  const [t] = useTransContext();

  const updateCourse = async (
    courseId: string,
    updates: {
      name?: string;
      city?: string | null;
      country?: string | null;
    },
  ) => {
    const result = await supabase.from("courses").update(updates).eq("id", courseId);

    if (!result.error) {
      await props.onUpdated();
    } else {
      console.error("Failed to update course details", result.error);
    }

    return result;
  };

  return (
    <Show
      when={props.course}
      fallback={
        <div class='flex min-h-40 items-center justify-center'>
          <LoadingCss />
        </div>
      }
    >
      {(course) => {
        const [name, setName] = createSignal(course().name ?? "");
        const [city, setCity] = createSignal(course().city ?? "");
        const [country, setCountry] = createSignal(course().country ?? "");

        const nameBlur = useBlurSave(name, async (value) =>
          updateCourse(course().id, { name: value.trim() }),
        );
        const cityBlur = useBlurSave(city, async (value) =>
          updateCourse(course().id, { city: value.trim() || null }),
        );
        const countryBlur = useBlurSave(country, async (value) =>
          updateCourse(course().id, { country: value.trim() || null }),
        );

        return (
          <div class='text-slate-800'>
            <p class='font-grotesk text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700'>
              {t("admin.courses.profile")}
            </p>

            <div class='mt-3 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4'>
              <label class='block'>
                <span class='mb-1 block font-grotesk text-sm font-medium text-slate-500'>
                  {t("admin.courses.courseName")}
                </span>
                <input
                  class={`w-full rounded-md border border-slate-300 p-2 font-rubik text-lg font-semibold text-slate-800 transition-colors duration-300 ${nameBlur.stateClasses()} ${
                    nameBlur.loading() ? "opacity-70" : ""
                  }`}
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  onFocus={nameBlur.handleFocus}
                  onBlur={nameBlur.handleBlur}
                  disabled={nameBlur.loading()}
                />
              </label>

              <label class='block'>
                <span class='mb-1 block font-grotesk text-sm font-medium text-slate-500'>
                  {t("admin.city")}
                </span>
                <input
                  class={`w-full rounded-md border border-slate-300 p-2 font-rubik text-sm font-semibold text-slate-800 transition-colors duration-300 ${cityBlur.stateClasses()} ${
                    cityBlur.loading() ? "opacity-70" : ""
                  }`}
                  value={city()}
                  onInput={(e) => setCity(e.currentTarget.value)}
                  onFocus={cityBlur.handleFocus}
                  onBlur={cityBlur.handleBlur}
                  disabled={cityBlur.loading()}
                />
              </label>

              <label class='block'>
                <span class='mb-1 block font-grotesk text-sm font-medium text-slate-500'>
                  {t("admin.country")}
                </span>
                <input
                  class={`w-full rounded-md border border-slate-300 p-2 font-rubik text-sm font-semibold text-slate-800 transition-colors duration-300 ${countryBlur.stateClasses()} ${
                    countryBlur.loading() ? "opacity-70" : ""
                  }`}
                  value={country()}
                  onInput={(e) => setCountry(e.currentTarget.value)}
                  onFocus={countryBlur.handleFocus}
                  onBlur={countryBlur.handleBlur}
                  disabled={countryBlur.loading()}
                />
              </label>

              <div class='flex items-center justify-between gap-4'>
                <span class='font-grotesk text-sm font-medium text-slate-500'>
                  {t("admin.created")}
                </span>
                <span class='font-rubik text-sm font-semibold text-slate-800'>
                  {new Date(course().created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <A
              class='mt-5 inline-flex w-full items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100'
              href={`/admin/import_scorecard/${course().id}`}
            >
              {t("admin.scorecard.import")}
            </A>
          </div>
        );
      }}
    </Show>
  );
};

export default Course_details;
