import { createMemo, createSignal, For } from "solid-js";
import { THole, TScorecard, TTee } from "../../lib/definitions";
import { supabase } from "../../supabase/client";

// saves the value of the input when it is focused and compares it to the value when it is blurred. If they are different, it calls the save function and updates the status for feedback classes. It also resets the status after 3 seconds. This is used for both par and yardage inputs in the scorecard.
import { useBlurSave } from "../../hooks/useBlurSave";

type HoleRow = {
  holeId: string;
  holeNumber: number;
  par: number;
  yardagesByTeeId: Record<string, number | null>;
};

type Status = "idle" | "success" | "error";

const Scorecard = (props: {
  tees: TTee[];
  holes: THole[];
  holeTees: TScorecard[];
}) => {
  const rows = createMemo<HoleRow[] | undefined>(() => {
    if (!props.holes) return [];

    // this builds a lookup table (this is the key)
    const holeTeeMap = new Map<string, number>();
    // console.log(holeTeeMap);
    // console.log("HOLE_TEE KEYS", [...holeTeeMap.keys()]);
    /* it makes rows like
      (h1, tW) → 380 
      (h1, tY) → 365 
    */
    for (const ht of props.holeTees) {
      holeTeeMap.set(`${ht.hole_id}:${ht.tee_id}`, ht.yardage); // "1:1", 380   "2:1", 365
      /* Stores them so you can ask:  
        “What is the yardage for hole X from tee Y?”
        This avoids nested loops later and keeps things fast. */
      // console.log(holeTeeMap);
    }
    //console.log("HOLE_TEE KEYS", [...holeTeeMap.keys()]);

    return props.holes.map((hole) => {
      const yardagesByTeeId: Record<string, number | null> = {};

      for (const tee of props.tees) {
        yardagesByTeeId[tee.id] =
          holeTeeMap.get(`${hole.id}:${tee.id}`) ?? null;
        //console.log("LOOKUP", `${hole.id}:${tee.id}`);
      }

      return {
        holeId: hole.id,
        holeNumber: hole.hole_number,
        par: hole.par,
        yardagesByTeeId,
      };
    });
  });

  //update hole par
  const updateHolePar = async (
    holeId: string,
    updates: Partial<{ par: number }>,
  ) => {
    const result = await supabase
      .from("holes")
      .update(updates)
      .eq("id", holeId);

    if (result.error) {
      console.error("Error updating hole:", result.error);
    } else {
      console.log("Hole updated successfully");
    }
    return result;
  };

  // update hole tee yardage
  const updateHoleTee = async (
    holeId: string,
    teeId: string,
    yardage: number,
  ) => {
    const result = await supabase
      .from("hole_tee")
      .update({ yardage })
      .eq("hole_id", holeId)
      .eq("tee_id", teeId);
    if (result.error) {
      console.error("Error updating hole tee:", result.error);
    } else {
      console.log("Hole tee updated successfully");
    }
    return result;
  };

  return (
    <>
      {props.holes.length === 0 ? (
        <div class='text-center'>No course details found</div>
      ) : (
        <div class='flex  justify-center'>
          <table class='border-separate border-spacing-2 border border-gray-400  '>
            <thead class='bg-neutral-900 border-b text-neutral-400'>
              <tr>
                <th scope='col' class='w-24 px-6 py-3 font-bold items-center'>
                  Hole
                </th>
                <th scope='col' class='w-24 px-6 py-3 font-bold'>
                  Par
                </th>
                <For each={props.tees}>
                  {(t) => (
                    <th scope='col' class='w-24 px-6 py-3 font-bold'>
                      {t.color}
                    </th>
                  )}
                </For>
              </tr>
            </thead>

            <tbody>
              <For each={rows()}>
                {(row) => {
                  // local signal for par field
                  const [parValue, setParValue] = createSignal(row.par);

                  const parBlur = useBlurSave(parValue, async (value) => {
                    return await updateHolePar(row.holeId, { par: value });
                  });

                  return (
                    <tr class='text-center'>
                      <td>{row.holeNumber}</td>

                      <td>
                        <input
                          type='number'
                          min={3}
                          max={5}
                          value={parValue()}
                          onInput={(e) => setParValue(+e.currentTarget.value)}
                          onFocus={parBlur.handleFocus}
                          onBlur={parBlur.handleBlur}
                          disabled={parBlur.loading()}
                          class={`px-2 py-1 border rounded-md transition-colors duration-300
                ${parBlur.stateClasses()}
                ${parBlur.loading() ? "opacity-70" : ""}`}
                        />
                      </td>

                      <For each={props.tees}>
                        {(tee) => {
                          // ✅ separate instance per tee input
                          const [yardage, setYardage] = createSignal(
                            row.yardagesByTeeId[tee.id] ?? "",
                          );

                          const yardageBlur = useBlurSave(
                            yardage,
                            async (value) =>
                              await updateHoleTee(row.holeId, tee.id, +value),
                          );

                          return (
                            <td>
                              <input
                                type='number'
                                value={yardage()}
                                onInput={(e) =>
                                  setYardage(e.currentTarget.value)
                                }
                                onFocus={yardageBlur.handleFocus}
                                onBlur={yardageBlur.handleBlur}
                                disabled={yardageBlur.loading()}
                                class={`border rounded-md p-1 w-24 transition-colors duration-300
                      ${yardageBlur.stateClasses()}
                      ${yardageBlur.loading() ? "opacity-70" : ""}`}
                              />
                            </td>
                          );
                        }}
                      </For>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default Scorecard;
