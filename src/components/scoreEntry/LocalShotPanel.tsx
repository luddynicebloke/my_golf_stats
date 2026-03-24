import { createEffect, createMemo, createSignal, For, Show } from "solid-js";

import Slider from "./Slider";
import {
  convertMetresToUnit,
  convertUnitToMetres,
  getDistanceUnitLabel,
  type DistanceUnit,
} from "../../lib/distance";
import {
  ballLies,
  type BallLie,
  type LocalShot,
  type ScorecardHole,
} from "../../lib/scoreEntryTypes";

type LocalShotPanelProps = {
  distanceUnit: DistanceUnit;
  entryError: string | null;
  hole: ScorecardHole;
  onCompleteHole: (hole: ScorecardHole, shots: LocalShot[]) => Promise<boolean>;
  savingHole: boolean;
  submitLabel?: string;
};

type PenaltyType = "oob-lost-ball" | "hazard-unplayable" | null;

const activeButtonClass = "border-cyan-300 bg-cyan-50 text-cyan-800";
const inactiveButtonClass =
  "border-slate-300 bg-white text-slate-700 hover:bg-slate-100";
const FEET_TO_METRES = 0.3048;
const METRES_TO_FEET = 3.28084;

const getDefaultLie = (hole: ScorecardHole): BallLie =>
  hole.par === 3 ? "Fairway" : "Tee";

const getDefaultDistance = (
  hole: ScorecardHole,
  lie: BallLie,
  distanceUnit: DistanceUnit,
): number =>
  lie === "Green"
    ? distanceUnit === "metres"
      ? 0.5
      : 15
    : convertMetresToUnit(hole.distanceMetres, distanceUnit);

const getPenaltyShotsForType = (penaltyType: PenaltyType): number => {
  if (penaltyType === "oob-lost-ball") return 2;
  if (penaltyType === "hazard-unplayable") return 1;
  return 0;
};

const getTotalShotCount = (shots: LocalShot[]): number =>
  shots.reduce((total, shot) => total + 1 + shot.penaltyShots, 0);

export default function LocalShotPanel(props: LocalShotPanelProps) {
  const [ballLie, setBallLie] = createSignal<BallLie>(
    getDefaultLie(props.hole),
  );
  const [sliderValue, setSliderValue] = createSignal(1);
  const [penaltyEnabled, setPenaltyEnabled] = createSignal(false);
  const [penaltyType, setPenaltyType] = createSignal<PenaltyType>(null);
  const [penaltyShots, setPenaltyShots] = createSignal<number | null>(null);
  const [recovery, setRecovery] = createSignal(false);
  const [holedOut, setHoledOut] = createSignal(false);
  const [shotsByHole, setShotsByHole] = createSignal<
    Record<number, LocalShot[]>
  >({});

  const currentHoleShots = createMemo(
    () => shotsByHole()[props.hole.hole_number] ?? [],
  );
  const currentShotNumber = createMemo(
    () => getTotalShotCount(currentHoleShots()) + 1,
  );
  const isGreenLie = createMemo(() => ballLie() === "Green");
  const sliderLabel = createMemo(() =>
    isGreenLie() ? "Distance to hole" : "Distance to pin",
  );
  const sliderUnitLabel = createMemo(() =>
    isGreenLie()
      ? "ft"
      : getDistanceUnitLabel(props.distanceUnit).toLowerCase(),
  );
  const sliderMin = createMemo(() =>
    isGreenLie() && props.distanceUnit === "metres" ? 0.5 : 1,
  );
  const sliderMax = createMemo(() =>
    isGreenLie()
      ? props.distanceUnit === "metres"
        ? 30
        : 100
      : Math.max(
          convertMetresToUnit(props.hole.distanceMetres, props.distanceUnit),
          convertMetresToUnit(549, props.distanceUnit),
        ),
  );
  const sliderStep = createMemo(() => {
    if (isGreenLie() && props.distanceUnit === "metres") {
      return 4.5;
    }

    return Math.max(1, Math.round(sliderMax() / 6));
  });
  const sliderMarks = createMemo(() =>
    Array.from({ length: 7 }, (_, index) =>
      Number((sliderMin() + sliderStep() * index).toFixed(1)),
    ),
  );

  const resetFlags = () => {
    setPenaltyEnabled(false);
    setPenaltyType(null);
    setPenaltyShots(null);
    setRecovery(false);
    setHoledOut(false);
  };

  const resetInputsForHole = (hole: ScorecardHole) => {
    const defaultLie = getDefaultLie(hole);
    setBallLie(defaultLie);
    setSliderValue(getDefaultDistance(hole, defaultLie, props.distanceUnit));
    resetFlags();
  };

  const togglePenalty = () => {
    const nextEnabled = !penaltyEnabled();
    setPenaltyEnabled(nextEnabled);

    if (!nextEnabled) {
      setPenaltyType(null);
      setPenaltyShots(null);
      return;
    }

    if (penaltyShots() == null) {
      setPenaltyType("hazard-unplayable");
      setPenaltyShots(1);
    }
  };

  const selectPenaltyType = (nextPenaltyType: Exclude<PenaltyType, null>) => {
    setPenaltyEnabled(true);
    setPenaltyType(nextPenaltyType);
    setPenaltyShots(getPenaltyShotsForType(nextPenaltyType));
  };

  const adjustPenaltyShots = (
    nextPenaltyType: Exclude<PenaltyType, null>,
    delta: number,
  ) => {
    setPenaltyEnabled(true);
    setPenaltyType(nextPenaltyType);
    setPenaltyShots((current) => {
      const baseValue =
        penaltyType() === nextPenaltyType
          ? (current ?? getPenaltyShotsForType(nextPenaltyType))
          : getPenaltyShotsForType(nextPenaltyType);
      return Math.max(0, baseValue + delta);
    });
  };

  const addLocalShot = async () => {
    const storedDistanceToPin = isGreenLie()
      ? props.distanceUnit === "metres"
        ? Number((sliderValue() * METRES_TO_FEET).toFixed(2))
        : sliderValue()
      : convertUnitToMetres(sliderValue(), props.distanceUnit);

    const nextShot: LocalShot = {
      shotNumber: currentShotNumber(),
      lieType: ballLie(),
      distanceToPin: storedDistanceToPin,
      penaltyShots: penaltyEnabled() ? Math.max(0, penaltyShots() ?? 0) : 0,
      recovery: recovery(),
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
      setSliderValue(props.distanceUnit === "metres" ? 5 : 15);
      return;
    }

    setSliderValue((currentValue) =>
      Math.min(sliderMax(), Math.max(sliderMin(), currentValue)),
    );
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
          min={sliderMin()}
          max={sliderMax()}
          valueSuffix={
            isGreenLie() && props.distanceUnit === "metres"
              ? "m"
              : sliderUnitLabel()
          }
          marksSuffix=''
          r1={sliderMarks()[0]}
          r2={sliderMarks()[1]}
          r3={sliderMarks()[2]}
          r4={sliderMarks()[3]}
          r5={sliderMarks()[4]}
          r6={sliderMarks()[5]}
          r7={sliderMarks()[6]}
        />

        <div class='mt-2'>
          {/* <p class='mb-3 text-sm font-medium text-slate-700'>Ball lie</p> */}
          <div class='grid grid-cols-5 gap-2'>
            <For each={ballLies}>
              {(lie) => (
                <button
                  type='button'
                  class={`w-full justify-center rounded-md border px-2 py-3 text-center text-xs font-semibold transition-colors sm:text-sm ${
                    ballLie() === lie ? activeButtonClass : inactiveButtonClass
                  }`}
                  onClick={() => setBallLie(lie)}
                >
                  {lie}
                </button>
              )}
            </For>
          </div>

          <div class='mt-4 flex flex-wrap items-end gap-3'>
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
              <div class='flex-1 space-y-3 rounded-lg border border-slate-200 bg-white p-3'>
                <div class='space-y-2'>
                  <div class='flex items-center justify-between gap-3'>
                    <label
                      class={`flex flex-1 items-center gap-3 rounded-md border px-3 py-3 text-sm font-semibold transition-colors ${
                        penaltyType() === "oob-lost-ball"
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}
                    >
                      <input
                        type='radio'
                        name={`penalty-type-${props.hole.hole_number}`}
                        checked={penaltyType() === "oob-lost-ball"}
                        onChange={() => selectPenaltyType("oob-lost-ball")}
                        class='h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-200'
                      />
                      <span>OOB / Lost Ball</span>
                    </label>
                    <div class='flex items-center gap-2 text-sm font-semibold text-slate-700'>
                      <button
                        type='button'
                        onClick={() => adjustPenaltyShots("oob-lost-ball", 2)}
                        class=' text-gray-800 rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-100'
                      >
                        +
                      </button>
                      <span class='min-w-5 text-center'>
                        {penaltyType() === "oob-lost-ball"
                          ? (penaltyShots() ?? 2)
                          : 2}
                      </span>
                      <button
                        type='button'
                        onClick={() => adjustPenaltyShots("oob-lost-ball", -2)}
                        class='text-gray-800 rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-100'
                      >
                        -
                      </button>
                    </div>
                  </div>

                  <div class='flex items-center justify-between gap-3'>
                    <label
                      class={`flex flex-1 items-center gap-3 rounded-md border px-3 py-3 text-sm font-semibold transition-colors ${
                        penaltyType() === "hazard-unplayable"
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}
                    >
                      <input
                        type='radio'
                        name={`penalty-type-${props.hole.hole_number}`}
                        checked={penaltyType() === "hazard-unplayable"}
                        onChange={() => selectPenaltyType("hazard-unplayable")}
                        class='h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-200'
                      />
                      <span>Hazard / Unplayable</span>
                    </label>
                    <div class='flex items-center gap-2 text-sm font-semibold text-slate-700'>
                      <button
                        type='button'
                        onClick={() =>
                          adjustPenaltyShots("hazard-unplayable", 1)
                        }
                        class='text-gray-800 rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-100'
                      >
                        +
                      </button>
                      <span class='min-w-5 text-center'>
                        {penaltyType() === "hazard-unplayable"
                          ? (penaltyShots() ?? 1)
                          : 1}
                      </span>
                      <button
                        type='button'
                        onClick={() =>
                          adjustPenaltyShots("hazard-unplayable", -1)
                        }
                        class='text-gray-800 rounded-md border border-slate-300 bg-white px-2 py-1 hover:bg-slate-100'
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Show>
          </div>

          <div class='mt-4 flex flex-wrap items-center justify-between gap-3'>
            <button
              type='button'
              class='rounded-md border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100'
              disabled={props.savingHole}
              onClick={() => void addLocalShot()}
            >
              {props.savingHole
                ? (props.submitLabel ?? "Saving...")
                : holedOut()
                  ? "Next hole"
                  : "Next shot"}
            </button>
            <div class='flex flex-wrap items-center gap-3'>
              <label
                for='recovery-shot'
                class='flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700'
              >
                <input
                  id='recovery-shot'
                  type='checkbox'
                  checked={recovery()}
                  onChange={(event) => setRecovery(event.currentTarget.checked)}
                  class='h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200'
                />
                Recovery
              </label>
              <label
                for='holed-out'
                class='flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700'
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
                      {shot.lieType === "Green"
                        ? props.distanceUnit === "metres"
                          ? Number((shot.distanceToPin * FEET_TO_METRES).toFixed(1))
                          : shot.distanceToPin
                        : convertMetresToUnit(
                            shot.distanceToPin,
                            props.distanceUnit,
                          )}{" "}
                      {shot.lieType === "Green"
                        ? props.distanceUnit === "metres"
                          ? "m"
                          : "ft"
                        : getDistanceUnitLabel(
                            props.distanceUnit,
                          ).toLowerCase()}
                    </span>
                    <Show when={shot.penaltyShots > 0}>
                      <span>Penalty {shot.penaltyShots}</span>
                    </Show>
                    <Show when={shot.recovery}>
                      <span class='font-semibold text-amber-700'>Recovery</span>
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
