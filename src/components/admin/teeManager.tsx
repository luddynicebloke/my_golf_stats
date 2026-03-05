import { createSignal, For, Show } from "solid-js";
import { TTee } from "../../lib/definitions";

import ConfirmationModal from "../ConfirmationModal";
import { supabase } from "../../supabase/client";
import { useBlurSave } from "../../hooks/useBlurSave";

type TeeManagerProps = {
  tees: TTee[] | null;
  onDeleteTee: (teeId: string) => Promise<void>;
};

const TeeManager = (props: TeeManagerProps) => {
  const [modalOpen, setModalOpen] = createSignal(false);
  const [selectedTeeId, setSelectedTeeId] = createSignal<string | null>(null);

  const openModal = (teeId: string) => {
    setSelectedTeeId(teeId);
    setModalOpen(true);
  };

  const updateTee = async (
    teeId: string,
    updates: Partial<{
      color: string | null;
      course_rating: number | null;
      slope_rating: number | null;
      total_yardage: number | null;
    }>,
  ) => {
    const result = await supabase.from("tees").update(updates).eq("id", teeId);

    if (result.error) {
      console.error("Failed to update tee", result.error);
    }
    return result;
  };

  return (
    <>
      <ConfirmationModal
        open={modalOpen()}
        title='Delete Tee'
        message='This action cannot be undone. Are you sure? If it is the 
        only tee at the course the course will also be deleted.'
        cancelText='No'
        onClose={(confirmed) => {
          if (confirmed && selectedTeeId()) {
            props.onDeleteTee(selectedTeeId()!);
            setModalOpen(false);
          } else {
            setModalOpen(false);
          }
        }}
      />
      <Show when={props.tees}>
        <section>
          <table class='w-full text-sm text-left rtl:text-right text-neutral-00'>
            <thead class='bg-neutral-900 border-b text-neutral-400'>
              <tr>
                <th scope='col' class='px-3 py-3 font-bold'>
                  ID
                </th>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Colour
                </th>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Metres
                </th>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Rating
                </th>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Slope
                </th>
                <th scope='col' class='px-6 py-3 font-bold'></th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>

          <table>
            <tbody>
              <For each={props.tees}>
                {(tee) => {
                  // ✅ local signals per field
                  const [color, setColor] = createSignal(tee.color);
                  const [totalYardage, setTotalYardage] = createSignal(
                    tee.total_yardage,
                  );

                  // ✅ blur instance for color
                  const colorBlur = useBlurSave(
                    color,
                    async (value) => await updateTee(tee.id, { color: value }),
                  );

                  // ✅ blur instance for total_yardage
                  const yardageBlur = useBlurSave(
                    totalYardage,
                    async (value) =>
                      await updateTee(tee.id, { total_yardage: value }),
                  );

                  return (
                    <tr class='odd:bg-neutral-700 even:bg-neutral-900 border-b'>
                      <td class='px-3 py-2'>{tee.id}</td>

                      {/* COLOR INPUT */}
                      <td class='px-3 py-2'>
                        <input
                          class={`border rounded-md p-1 w-32 transition-colors duration-300
                ${colorBlur.stateClasses()}
                ${colorBlur.loading() ? "opacity-70" : ""}`}
                          value={color()}
                          onInput={(e) => setColor(e.currentTarget.value)}
                          onFocus={colorBlur.handleFocus}
                          onBlur={colorBlur.handleBlur}
                          disabled={colorBlur.loading()}
                        />
                      </td>

                      {/* TOTAL YARDAGE INPUT */}
                      <td class='px-3 py-2'>
                        <input
                          class={`border rounded-md p-1 w-32 appearance-none transition-colors duration-300
                ${yardageBlur.stateClasses()}
                ${yardageBlur.loading() ? "opacity-70" : ""}`}
                          type='number'
                          value={totalYardage()}
                          onInput={(e) =>
                            setTotalYardage(+e.currentTarget.value)
                          }
                          onFocus={yardageBlur.handleFocus}
                          onBlur={yardageBlur.handleBlur}
                          disabled={yardageBlur.loading()}
                        />
                      </td>
                      {/* RATING INPUT */}
                      <td class='px-3 py-2'>
                        <input
                          class={`border rounded-md p-1 w-32 appearance-none transition-colors duration-300
                ${yardageBlur.stateClasses()}
                ${yardageBlur.loading() ? "opacity-70" : ""}`}
                          type='number'
                          value={tee.course_rating ?? ""}
                          onBlur={(e) =>
                            updateTee(tee.id, {
                              course_rating: +e.target.value,
                            })
                          }
                        />
                      </td>
                      {/* SLOPE INPUT */}
                      <td class='px-3 py-2'>
                        <input
                          class={`border rounded-md p-1 w-32 appearance-none transition-colors duration-300
                ${yardageBlur.stateClasses()}
                ${yardageBlur.loading() ? "opacity-70" : ""}`}
                          type='number'
                          value={tee.slope_rating ?? ""}
                          onBlur={(e) =>
                            updateTee(tee.id, { slope_rating: +e.target.value })
                          }
                        />
                      </td>
                      <td class='px-6 py-4' onClick={() => openModal(tee.id)}>
                        <span class='cursor-pointer'>🗑</span>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>

          {/* <button onClick={addTee}>+ Add Tee</button> */}
        </section>
      </Show>
    </>
  );
};

export default TeeManager;
