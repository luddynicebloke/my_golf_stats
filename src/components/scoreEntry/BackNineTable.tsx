import { For, Show } from "solid-js";

import type { ScorecardTableHole } from "./FrontNineTable";

type BackNineTableProps = {
  holes: ScorecardTableHole[];
};

const total = (holes: ScorecardTableHole[], key: keyof ScorecardTableHole) =>
  holes.reduce((sum, hole) => sum + (Number(hole[key]) || 0), 0);

export default function BackNineTable(props: BackNineTableProps) {
  return (
    <div class='w-full overflow-hidden'>
      <table class='w-full table-fixed text-center text-[10px] text-slate-700 sm:text-sm'>
        <tbody>
          <tr>
            <td class='px-0.5 py-2 font-bold text-slate-800 sm:px-2'>Hole</td>
            <For each={props.holes}>
              {(hole) => (
                <td class='px-0.5 py-2 font-semibold text-slate-800 sm:px-2'>
                  {hole.hole_number}
                </td>
              )}
            </For>
            <td class='px-0.5 py-2 font-bold text-slate-800 sm:px-2'>IN</td>
          </tr>

          <tr>
            <td class='px-0.5 py-2 font-bold text-slate-600 sm:px-2'>Yds</td>
            <For each={props.holes}>
              {(hole) => <td class='px-0.5 py-2 sm:px-2'>{hole.yardage}</td>}
            </For>
            <td class='px-0.5 py-2 font-semibold text-slate-800 sm:px-2'>
              {total(props.holes, "yardage")}
            </td>
          </tr>

          <tr>
            <td class='px-0.5 py-2 font-bold text-slate-600 sm:px-2'>Par</td>
            <For each={props.holes}>
              {(hole) => <td class='px-0.5 py-2 sm:px-2'>{hole.par}</td>}
            </For>
            <td class='px-0.5 py-2 font-semibold text-slate-800 sm:px-2'>
              {total(props.holes, "par")}
            </td>
          </tr>

          <tr>
            <td class='px-0.5 py-2 font-bold text-slate-600 sm:px-2'>Score</td>
            <For each={props.holes}>
              {(hole) => (
                <td class='px-0.5 py-2 sm:px-2'>
                  <span class='inline-flex min-w-0 justify-center rounded-md bg-white px-1 py-0.5 font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 sm:px-2 sm:py-1'>
                    {hole.score ?? "-"}
                  </span>
                </td>
              )}
            </For>
            <td class='px-0.5 py-2 font-semibold text-slate-800 sm:px-2'>
              <Show
                when={props.holes.some((hole) => hole.score != null)}
                fallback="-"
              >
                {total(props.holes, "score")}
              </Show>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
