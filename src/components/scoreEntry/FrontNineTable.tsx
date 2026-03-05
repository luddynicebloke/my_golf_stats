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
      <table class=' border-gray-300  text-center'>
        <tbody>
          {/* Hole Numbers */}
          <tr>
            <td class='p-0 font-bold '>Hole</td>
            <For each={props.holes}>
              {(h) => <td class='font-semibold'>{h.hole_number}</td>}
            </For>
            <td class='font-bold '>OUT</td>
          </tr>

          {/* Yardage */}
          <tr>
            <td class=' font-bold '>Yds</td>
            <For each={props.holes}>
              {(h) => <td class=' p-1'>{h.yardage}</td>}
            </For>
            <td class=' font-semibold'>{total("yardage")}</td>
          </tr>

          {/* Par */}
          <tr>
            <td class='font-bold '>Par</td>
            <For each={props.holes}>{(h) => <td class=' '>{h.par}</td>}</For>
            <td class='font-semibold'>{total("par")}</td>
          </tr>

          {/* Score */}
          <tr>
            <td class='  font-bold b'>Score</td>
            <For each={props.holes}>
              {(h) => (
                <td class=' '>
                  <input
                    type='number'
                    min='0'
                    value={h.strokes?.toString()}
                    class='w-5 text-center  rounded'
                    onInput={(e) =>
                      props.onChange?.(
                        h.hole_round_id,
                        Number(e.currentTarget.value),
                      )
                    }
                  />
                </td>
              )}
            </For>
            <td class='p-0 font-semibold'>{total("strokes")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
