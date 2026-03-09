import { Show } from "solid-js";
import { TCourse } from "../../lib/definitions";

import LoadingCss from "../LoadingCss";
import { A } from "@solidjs/router";

const Course_details = (props: { course: TCourse | undefined }) => {
  return (
    <Show
      when={props.course}
      fallback={
        <div class='flex min-h-40 items-center justify-center'>
          <LoadingCss />
        </div>
      }
    >
      <div class='text-slate-800'>
        <p class='font-grotesk text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700'>
          Course Profile
        </p>
        <h2 class='mt-2 font-rubik text-2xl font-semibold tracking-tight'>
          {props.course?.name}
        </h2>

        <div class='mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <div class='flex items-center justify-between gap-4'>
            <span class='font-grotesk text-sm font-medium text-slate-500'>
              City
            </span>
            <span class='font-rubik text-sm font-semibold text-slate-800'>
              {props.course?.city || "Unknown"}
            </span>
          </div>
          <div class='flex items-center justify-between gap-4'>
            <span class='font-grotesk text-sm font-medium text-slate-500'>
              Country
            </span>
            <span class='font-rubik text-sm font-semibold text-slate-800'>
              {props.course?.country || "Unknown"}
            </span>
          </div>
          <div class='flex items-center justify-between gap-4'>
            <span class='font-grotesk text-sm font-medium text-slate-500'>
              Created
            </span>
            <span class='font-rubik text-sm font-semibold text-slate-800'>
              {new Date(props.course!.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <A
          class='mt-5 inline-flex w-full items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100'
          href={`/admin/import_scorecard/${props.course?.id}`}
        >
          Import Scorecard
        </A>
      </div>
    </Show>
  );
};

export default Course_details;
