import { createEffect, createMemo, createSignal, For, Show } from "solid-js";

import Slider from "./Slider";
import {
  ballLies,
  type BallLie,
  type LocalShot,
  type ScorecardHole,
} from "../../lib/scoreEntryTypes";

type LocalShotPanelProps = {
  entryError: string | null;
  hole: ScorecardHole;
  onCompleteHole: (hole: ScorecardHole, shots: LocalShot[]) => Promise<boolean>;
  savingHole: boolean;
};

const activeButtonClass = "border-cyan-300 bg-cyan-50 text-cyan-800";
const inactiveButtonClass =
  "border-slate-300 bg-white text-slate-700 hover:bg-slate-100";

const getDefaultLie = (hole: ScorecardHole): BallLie =>
  hole.par === 3 ? "Fairway" : "Tee";

const getDefaultDistance = (hole: ScorecardHole, lie: BallLie): number =>
  lie === "Green" ? 15 : hole.yardage;

export default function LocalShotPanel(props: LocalShotPanelProps) {
  const [ballLie, setBallLie] = createSignal<BallLie>(getDefaultLie(props.hole));
  const [sliderValue, setSliderValue] = createSignal(1);
  const [penaltyEnabled, setPenaltyEnabled] = createSignal(false);
  const [penaltyShots, setPenaltyShots] = createSignal<number | null>(null);
  const [holedOut, setHoledOut] = createSignal(false);
  const [shotsByHole, setShotsByHole] = createSignal<
    Record<number, LocalShot[]>
  >({});

  const currentHoleShots = createMemo(
    () => shotsByHole()[props.hole.hole_number] ?? [],
  );
  const currentShotNumber = createMemo(() => currentHoleShots().length + 1);
  const isGreenLie = createMemo(() => ballLie() === "Green");
  const sliderLabel = createMemo(() =>
    isGreenLie() ? "Distance to hole" : "Distance to pin",
  );
  const sliderMax = createMemo(() =>
    isGreenLie() ? 100 : Math.max(props.hole.yardage, 600),
  );
  const sliderStep = createMemo(() => Math.max(1, Math.round(sliderMax() / 6)));
  const sliderMarks = createMemo(() =>
    Array.from({ length: 7 }, (_, index) => sliderStep() * index),
  );

  const resetFlags = () => {
    setPenaltyEnabled(false);
    setPenaltyShots(null);
    setHoledOut(false);
  };

  const resetInputsForHole = (hole: ScorecardHole) => {
    const defaultLie = getDefaultLie(hole);
    setBallLie(defaultLie);
    setSliderValue(getDefaultDistance(hole, defaultLie));
    resetFlags();
  };

  const togglePenalty = () => {
    const nextEnabled = !penaltyEnabled();
    setPenaltyEnabled(nextEnabled);

    if (!nextEnabled) {
      setPenaltyShots(null);
      return;
    }

    if (penaltyShots() == null) {
      setPenaltyShots(1);
    }
  };

  const addLocalShot = async () => {
    const nextShot: LocalShot = {
      shotNumber: currentHoleShots().length + 1,
      lieType: ballLie(),
      distanceToPin: sliderValue(),
      penaltyShots: penaltyEnabled() ? Math.max(0, penaltyShots() ?? 0) : 0,
      holedOut: holedOut(),
    };
    const updatedShots = [...currentHoleShots(), nextShot];

    if (nextShot.holedOut) {
      const completed = await props.onCompleteHole(props.hole, updatedShots);
      if (!completed) return;

      setShotsByHole((current) => ({
        ...current,
        [props.hole.hole_number]: [],
      }));
      resetInputsForHole(props.hole);
      return;
    }

    setShotsByHole((current) => ({
      ...current,
      [props.hole.hole_number]: updatedShots,
    }));
    resetFlags();
  };

  const deleteLastLocalShot = () => {
    const shots = currentHoleShots();
    if (shots.length === 0) return;

    setShotsByHole((current) => ({
      ...current,
      [props.hole.hole_number]: shots.slice(0, -1),
    }));
  };

  createEffect(() => {
    resetInputsForHole(props.hole);
  });

  createEffect(() => {
    if (isGreenLie()) {
      setSliderValue(15);
      return;
    }

    setSliderValue((currentValue) => Math.min(currentValue, sliderMax()));
  });

  return (
    <>
      <div class='rounded-xl border border-slate-200 bg-slate-50 p-4'>
        <div class='mb-4 flex items-center justify-between gap-3'>
          <h3 class='font-rubik text-base font-semibold text-slate-800'>
            Shot {currentShotNumber()}
          </h3>
        </div>

        <Slider
          id={`hole-${props.hole.hole_number}-distance`}
          label={sliderLabel()}
          value={sliderValue()}
          onChange={setSliderValue}
          max={sliderMax()}
          r1={sliderMarks()[0]}
          r2={sliderMarks()[1]}
          r3={sliderMarks()[2]}
          r4={sliderMarks()[3]}
          r5={sliderMarks()[4]}
          r6={sliderMarks()[5]}
          r7={sliderMarks()[6]}
        />

        <div class='mt-2'>
          <p class='mb-3 text-sm font-medium text-slate-700'>Ball lie</p>
          <div class='grid grid-cols-6 gap-2'>
            <For each={ballLies}>
              {(lie) => (
                <button
                  type='button'
                  class={`justify-center rounded-md border px-2 py-3 text-center text-xs font-semibold transition-colors sm:text-sm ${
                    ballLie() === lie ? activeButtonClass : inactiveButtonClass
                  }`}
                  onClick={() => setBallLie(lie)}
                >
                  {lie}
                </button>
              )}
            </For>
          </div>

          <div class='mt-4 flex items-end gap-3'>
            <button
              type='button'
              class={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                penaltyEnabled() ? activeButtonClass : inactiveButtonClass
              }`}
              onClick={togglePenalty}
            >
              Penalty
            </button>

            <Show when={penaltyEnabled()}>
              <div class='w-24'>
                <input
                  id='penalty-shots'
                  type='number'
                  min='1'
                  step='1'
                  value={penaltyShots() ?? ""}
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    setPenaltyShots(value === "" ? null : Number(value));
                  }}
                  class='block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100'
                />
              </div>
            </Show>

            <label
              for='holed-out'
              class='ml-auto flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700'
            >
              <input
                id='holed-out'
                type='checkbox'
                checked={holedOut()}
                onChange={(event) => setHoledOut(event.currentTarget.checked)}
                class='h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200'
              />
              Holed out
            </label>
          </div>

          <div class='mt-4'>
            <button
              type='button'
              class='rounded-md border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100'
              disabled={props.savingHole}
              onClick={() => void addLocalShot()}
            >
              {props.savingHole
                ? "Saving..."
                : holedOut()
                  ? "Next hole"
                  : "Next shot"}
            </button>
          </div>
        </div>
      </div>

      <Show when={props.entryError}>
        <p class='mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>
          {props.entryError}
        </p>
      </Show>

      <div class='mt-4 rounded-xl border border-slate-200 bg-white p-4'>
        <div class='flex items-center justify-between gap-3'>
          <h3 class='font-rubik text-base font-semibold text-slate-800'>
            Current Hole Shots
          </h3>
          <div class='text-sm text-slate-500'>Shot {currentShotNumber()}</div>
          <Show when={currentHoleShots().length > 0}>
            <button
              type='button'
              class='rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100'
              onClick={deleteLastLocalShot}
            >
              Delete last shot
            </button>
          </Show>
        </div>

        <Show
          when={currentHoleShots().length > 0}
          fallback={
            <p class='mt-3 text-sm text-slate-500'>
              No local shots saved for this hole yet.
            </p>
          }
        >
          <div class='mt-3 space-y-2'>
            <For each={currentHoleShots()}>
              {(shot) => (
                <div class='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700'>
                  <div class='flex flex-wrap items-center gap-3'>
                    <span class='font-semibold text-slate-800'>
                      Shot {shot.shotNumber}
                    </span>
                    <span>{shot.lieType}</span>
                    <span>
                      {shot.distanceToPin}{" "}
                      {shot.lieType === "Green" ? "ft" : "yds"}
                    </span>
                    <Show when={shot.penaltyShots > 0}>
                      <span>Penalty {shot.penaltyShots}</span>
                    </Show>
                    <Show when={shot.holedOut}>
                      <span class='font-semibold text-emerald-700'>
                        Holed out
                      </span>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </>
  );
}
