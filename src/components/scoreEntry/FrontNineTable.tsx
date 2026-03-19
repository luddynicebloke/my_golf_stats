import { For, Show } from "solid-js";

export type ScorecardTableHole = {
  hole_number: number;
  par: number;
  yardage: number;
  score?: number | null;
};

type FrontNineTableProps = {
  holes: ScorecardTableHole[];
};

const total = (holes: ScorecardTableHole[], key: keyof ScorecardTableHole) =>
  holes.reduce((sum, hole) => sum + (Number(hole[key]) || 0), 0);

const getScoreClass = (score: number | null | undefined, par: number) => {
  if (score == null || score === 0) {
    return "bg-white text-slate-700 ring-slate-200";
  }

  if (score > par) {
    return "bg-slate-900 text-white ring-slate-900";
  }

  if (score === par) {
    return "bg-white font-bold text-slate-800 ring-slate-300";
  }

  return "bg-rose-600 text-white ring-rose-600";
};

export default function FrontNineTable(props: FrontNineTableProps) {
  return (
    <div class='w-full overflow-hidden'>
      <table class='w-full table-fixed text-center text-xs text-slate-700 sm:text-base'>
        <tbody>
          <tr class='border-b border-slate-200 '>
            <td class='w-10 px-1 py-2 font-bold whitespace-nowrap text-slate-800 sm:w-auto sm:px-3 sm:py-4'>
              Hole
            </td>
            <For each={props.holes}>
              {(hole) => (
                <td class='px-1 py-2 font-semibold text-slate-800 sm:px-3 sm:py-4'>
                  {hole.hole_number}
                </td>
              )}
            </For>
            <td class='w-10 px-1 py-2 font-bold whitespace-nowrap text-slate-800 sm:w-auto sm:px-3 sm:py-4'>
              OUT
            </td>
          </tr>

          <tr class='border-b border-slate-100'>
            <td class='w-10 px-1 py-2 font-bold whitespace-nowrap text-slate-600 sm:w-auto sm:px-3 sm:py-4'>
              Yds
            </td>
            <For each={props.holes}>
              {(hole) => (
                <td class='px-1 py-2 sm:px-3 sm:py-4'>{hole.yardage}</td>
              )}
            </For>
            <td class='w-10 px-1 py-2 font-semibold text-slate-800 sm:w-auto sm:px-3 sm:py-4'>
              {total(props.holes, "yardage")}
            </td>
          </tr>

          <tr class='border-b border-slate-100'>
            <td class='w-10 px-1 py-2 font-bold whitespace-nowrap text-slate-600 sm:w-auto sm:px-3 sm:py-4'>
              Par
            </td>
            <For each={props.holes}>
              {(hole) => <td class='px-1 py-2 sm:px-3 sm:py-4'>{hole.par}</td>}
            </For>
            <td class='w-10 px-1 py-2 font-semibold text-slate-800 sm:w-auto sm:px-3 sm:py-4'>
              {total(props.holes, "par")}
            </td>
          </tr>

          <tr>
            <td class='w-10 px-1 py-2 font-bold whitespace-nowrap text-slate-600 sm:w-auto sm:px-3 sm:py-4'>
              Score
            </td>
            <For each={props.holes}>
              {(hole) => (
                <td class='px-1 py-2 sm:px-3 sm:py-4'>
                  <span
                    class={`inline-flex min-w-[1.9rem] justify-center rounded-md px-1 py-0.5 font-medium shadow-sm ring-1 sm:min-w-[3.25rem] sm:px-3 sm:py-1.5 ${getScoreClass(
                      hole.score,
                      hole.par,
                    )}`}
                  >
                    {hole.score ?? "-"}
                  </span>
                </td>
              )}
            </For>
            <td class='w-10 px-1 py-2 font-semibold text-slate-800 sm:w-auto sm:px-3 sm:py-4'>
              <Show
                when={props.holes.some((hole) => hole.score != null)}
                fallback='-'
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
