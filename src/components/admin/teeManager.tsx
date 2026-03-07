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
        message='This action cannot be undone. Are you sure? If it is the only tee at the course the course will also be deleted.'
        cancelText='No'
        onClose={(confirmed) => {
          if (confirmed && selectedTeeId()) {
            props.onDeleteTee(selectedTeeId()!);
          }
          setModalOpen(false);
        }}
      />

      <Show when={props.tees}>
        <section>
          <div class='mb-3'>
            <h3 class='font-rubik text-lg font-semibold text-slate-800'>
              Tee Settings
            </h3>
            <p class='font-grotesk text-sm text-slate-500'>
              Edit tee color, yardage, rating, and slope values.
            </p>
          </div>

          <div class='overflow-x-auto rounded-xl border border-slate-200'>
            <table class='w-full min-w-[740px] text-left text-sm text-slate-700'>
              <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
                <tr>
                  <th scope='col' class='px-3 py-3 font-bold'>
                    ID
                  </th>
                  <th scope='col' class='px-4 py-3 font-bold'>
                    Colour
                  </th>
                  <th scope='col' class='px-4 py-3 font-bold'>
                    Metres
                  </th>
                  <th scope='col' class='px-4 py-3 font-bold'>
                    Rating
                  </th>
                  <th scope='col' class='px-4 py-3 font-bold'>
                    Slope
                  </th>
                  <th scope='col' class='px-4 py-3 text-right font-bold'>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={props.tees}>
                  {(tee) => {
                    const [color, setColor] = createSignal(tee.color);
                    const [totalYardage, setTotalYardage] = createSignal(
                      tee.total_yardage,
                    );

                    const colorBlur = useBlurSave(
                      color,
                      async (value) => await updateTee(tee.id, { color: value }),
                    );

                    const yardageBlur = useBlurSave(
                      totalYardage,
                      async (value) =>
                        await updateTee(tee.id, { total_yardage: value }),
                    );

                    return (
                      <tr class='border-b border-slate-200 odd:bg-white even:bg-slate-50'>
                        <td class='px-3 py-2'>{tee.id}</td>
                        <td class='px-4 py-2'>
                          <input
                            class={`w-28 rounded-md border border-slate-300 p-1 transition-colors duration-300 ${colorBlur.stateClasses()} ${
                              colorBlur.loading() ? "opacity-70" : ""
                            }`}
                            value={color()}
                            onInput={(e) => setColor(e.currentTarget.value)}
                            onFocus={colorBlur.handleFocus}
                            onBlur={colorBlur.handleBlur}
                            disabled={colorBlur.loading()}
                          />
                        </td>
                        <td class='px-4 py-2'>
                          <input
                            class={`w-24 appearance-none rounded-md border border-slate-300 p-1 transition-colors duration-300 ${yardageBlur.stateClasses()} ${
                              yardageBlur.loading() ? "opacity-70" : ""
                            }`}
                            type='number'
                            value={totalYardage()}
                            onInput={(e) => setTotalYardage(+e.currentTarget.value)}
                            onFocus={yardageBlur.handleFocus}
                            onBlur={yardageBlur.handleBlur}
                            disabled={yardageBlur.loading()}
                          />
                        </td>
                        <td class='px-4 py-2'>
                          <input
                            class={`w-24 appearance-none rounded-md border border-slate-300 p-1 transition-colors duration-300 ${yardageBlur.stateClasses()} ${
                              yardageBlur.loading() ? "opacity-70" : ""
                            }`}
                            type='number'
                            value={tee.course_rating ?? ""}
                            onBlur={(e) =>
                              updateTee(tee.id, {
                                course_rating: +e.target.value,
                              })
                            }
                          />
                        </td>
                        <td class='px-4 py-2'>
                          <input
                            class={`w-24 appearance-none rounded-md border border-slate-300 p-1 transition-colors duration-300 ${yardageBlur.stateClasses()} ${
                              yardageBlur.loading() ? "opacity-70" : ""
                            }`}
                            type='number'
                            value={tee.slope_rating ?? ""}
                            onBlur={(e) =>
                              updateTee(tee.id, {
                                slope_rating: +e.target.value,
                              })
                            }
                          />
                        </td>
                        <td class='px-4 py-2 text-right'>
                          <button
                            class='inline-flex self-auto rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100'
                            onClick={() => openModal(tee.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </section>
      </Show>
    </>
  );
};

export default TeeManager;
