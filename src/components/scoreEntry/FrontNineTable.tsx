import { For } from "solid-js";

type ScorecardHole = {
  hole_round_id: number;
  hole_number: number;
  par: number;
  yardage: number;
  strokes: number | null;
};

export default function FrontNineTable(props: {
  holes: ScorecardHole[];
  onChange?: (hole_round_id: number, strokes: number) => void;
}) {
  const total = (key: keyof ScorecardHole) =>
    props.holes.reduce((t, h) => t + (Number(h[key]) || 0), 0);

  return (
    <div class='max-w-full'>
      <table class='text-center text-slate-700 dark:text-slate-600'>
        <tbody>
          <tr>
            <td class='p-0 font-bold text-slate-800 dark:text-slate-600'>
              Hole
            </td>
            <For each={props.holes}>
              {(h) => (
                <td class='font-semibold text-slate-800 dark:text-slate-600'>
                  {h.hole_number}
                </td>
              )}
            </For>
            <td class='font-bold text-slate-800 dark:text-slate-600'>OUT</td>
          </tr>

          <tr>
            <td class='font-bold text-slate-700 dark:text-slate-600'>Yds</td>
            <For each={props.holes}>
              {(h) => <td class='p-1'>{h.yardage}</td>}
            </For>
            <td class='font-semibold text-slate-800 dark:text-slate-600'>
              {total("yardage")}
            </td>
          </tr>

          <tr>
            <td class='font-bold text-slate-700 dark:text-slate-600'>Par</td>
            <For each={props.holes}>{(h) => <td>{h.par}</td>}</For>
            <td class='font-semibold text-slate-800 dark:text-slate-600'>
              {total("par")}
            </td>
          </tr>

          <tr>
            <td class=' font-bold text-slate-700 dark:text-slate-600'>Score</td>
            <For each={props.holes}>
              {(h) => (
                <td>
                  {props.onChange ? (
                    <input
                      type='number'
                      min='0'
                      value={h.strokes?.toString()}
                      class='w-8 rounded border border-slate-700 bg-slate-800 text-center text-white dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                      onInput={(e) =>
                        props.onChange?.(
                          h.hole_round_id,
                          Number(e.currentTarget.value),
                        )
                      }
                    />
                  ) : (
                    <span class='inline-block min-w-6 px-1 py-0.5 text-center bg-gray-700 rounded-sm text-white '>
                      {h.strokes ?? 0}
                    </span>
                  )}
                </td>
              )}
            </For>
            <td class='bg-slate-500 rounded-sm p-0 font-semibold text-white'>
              {total("strokes")}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
