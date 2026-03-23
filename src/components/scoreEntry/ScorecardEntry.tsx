import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";

import { useAuth } from "../../context/AuthProvider";
import { calculateAndSaveRoundSG } from "../../hooks/useCalcSG";
import {
  formatMetresForDisplay,
  normalizeDistanceUnit,
} from "../../lib/distance";
import { supabase } from "../../supabase/client";
import BackNineTable from "./BackNineTable";
import FrontNineTable from "./FrontNineTable";
import LocalShotPanel from "./LocalShotPanel";
import { type LocalShot, type ScorecardHole } from "../../lib/scoreEntryTypes";

type RoundHeader = {
  courseName: string;
  teeColor: string;
};

type RoundRow = {
  id: number;
  hole_id: number;
  score: number | null;
  completed: boolean | null;
  holes:
    | {
        hole_number: number;
        par: number;
      }
    | {
        hole_number: number;
        par: number;
      }[]
    | null;
};

const emptyHeader: RoundHeader = {
  courseName: "",
  teeColor: "",
};

const activeButtonClass = "border-cyan-300 bg-cyan-50 text-cyan-800";
const inactiveButtonClass =
  "border-slate-300 bg-white text-slate-700 hover:bg-slate-100";

const getHoleScore = (shots: LocalShot[]): number =>
  shots.reduce((total, shot) => total + 1 + shot.penaltyShots, 0);

const getSingleRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export default function ScorecardEntry(props: { id: string }) {
  const roundId = Number(props.id);
  const { profile } = useAuth();

  const [activeNine, setActiveNine] = createSignal<"front" | "back">("front");
  const [selectedHoleNumber, setSelectedHoleNumber] = createSignal(1);
  const [scorecard, setScorecard] = createSignal<ScorecardHole[]>([]);
  const [roundHeader, setRoundHeader] = createSignal<RoundHeader>(emptyHeader);
  const [loading, setLoading] = createSignal(true);
  const [loadError, setLoadError] = createSignal<string | null>(null);
  const [entryError, setEntryError] = createSignal<string | null>(null);
  const [savingHole, setSavingHole] = createSignal(false);
  const [roundCompleted, setRoundCompleted] = createSignal(false);

  const frontNine = createMemo(() =>
    scorecard().filter((hole) => hole.hole_number <= 9),
  );
  const backNine = createMemo(() =>
    scorecard().filter((hole) => hole.hole_number >= 10),
  );
  const selectedHole = createMemo(
    () =>
      scorecard().find((hole) => hole.hole_number === selectedHoleNumber()) ??
      scorecard()[0],
  );
  const distanceUnit = createMemo(() =>
    normalizeDistanceUnit(profile()?.preferred_distance_unit),
  );

  const setNine = (nine: "front" | "back") => {
    setActiveNine(nine);
  };

  const loadScorecard = async () => {
    if (Number.isNaN(roundId)) {
      setLoadError("Invalid round id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("tee_id, courses(name), tees(color)")
      .eq("id", roundId)
      .single();

    if (roundError || !round) {
      setLoadError(roundError?.message ?? "Failed to load round details.");
      setLoading(false);
      return;
    }

    const course = getSingleRelation<{ name: string }>(round.courses);
    const tee = getSingleRelation<{ color: string }>(round.tees);

    setRoundHeader({
      courseName: course?.name ?? "",
      teeColor: tee?.color ?? "",
    });

    const teeId = Number(round.tee_id);
    const { data: holeRows, error: holeRowsError } = await supabase
      .from("round_holes")
      .select("id, hole_id, score, completed, holes(hole_number, par)")
      .eq("round_id", roundId)
      .order("id", { ascending: true });

    if (holeRowsError) {
      setLoadError(holeRowsError.message);
      setLoading(false);
      return;
    }

    const holeIds = (holeRows ?? []).map((row) => row.hole_id);
    const { data: yardageRows, error: yardageError } = await supabase
      .from("hole_tee")
      .select("hole_id, yardage")
      .eq("tee_id", teeId)
      .in("hole_id", holeIds);

    if (yardageError) {
      setLoadError(yardageError.message);
      setLoading(false);
      return;
    }

    const yardageByHoleId = new Map<number, number>();
    for (const row of yardageRows ?? []) {
      yardageByHoleId.set(Number(row.hole_id), Number(row.yardage));
    }

    const rows = ((holeRows ?? []) as RoundRow[])
      .map((row) => {
        const hole = getSingleRelation(row.holes);
        if (!hole) return null;

        return {
          round_hole_id: Number(row.id),
          hole_id: Number(row.hole_id),
          hole_number: Number(hole.hole_number),
          par: Number(hole.par),
          distanceMetres: yardageByHoleId.get(Number(row.hole_id)) ?? 0,
          score: row.score == null ? null : Number(row.score),
          completed: Boolean(row.completed),
        } satisfies ScorecardHole;
      })
      .filter((row): row is ScorecardHole => row !== null)
      .sort((a, b) => a.hole_number - b.hole_number);

    setScorecard(rows);
    if (rows.length > 0) {
      const nextHole = rows.find((hole) => !hole.completed) ?? rows[rows.length - 1];
      setActiveNine(nextHole.hole_number <= 9 ? "front" : "back");
      setSelectedHoleNumber(nextHole.hole_number);
    }
    setRoundCompleted(rows.length > 0 && rows.every((hole) => hole.completed));
    setLoading(false);
  };

  const updateScorecardHole = (
    holeNumber: number,
    updates: Partial<ScorecardHole>,
  ) => {
    setScorecard((current) =>
      current.map((hole) =>
        hole.hole_number === holeNumber ? { ...hole, ...updates } : hole,
      ),
    );
  };

  const moveToNextHole = (completedHoleNumber: number) => {
    const nextHole = scorecard().find(
      (hole) => hole.hole_number > completedHoleNumber && !hole.completed,
    );

    if (!nextHole) return false;

    setSelectedHoleNumber(nextHole.hole_number);
    setActiveNine(nextHole.hole_number <= 9 ? "front" : "back");
    return true;
  };

  const persistCompletedHole = async (
    hole: ScorecardHole,
    completedShots: LocalShot[],
  ): Promise<boolean> => {
    setEntryError(null);
    setSavingHole(true);

    try {
      const shotRows = completedShots.map((shot) => ({
        round_hole_id: hole.round_hole_id,
        shot_number: shot.shotNumber,
        distance_to_pin: shot.distanceToPin,
        lie_type: shot.lieType,
        penalty_strokes: shot.penaltyShots,
        recovery: shot.recovery,
        holed_out: shot.holedOut,
      }));

      const score = getHoleScore(completedShots);

      const { error: deleteExistingError } = await supabase
        .from("shots")
        .delete()
        .eq("round_hole_id", hole.round_hole_id);

      if (deleteExistingError) {
        throw new Error(deleteExistingError.message);
      }

      const { error: insertShotsError } = await supabase
        .from("shots")
        .insert(shotRows);

      if (insertShotsError) {
        throw new Error(insertShotsError.message);
      }

      const { data: updatedHoles, error: updateHoleError } = await supabase
        .from("round_holes")
        .update({
          score,
          completed: true,
        })
        .eq("round_id", roundId)
        .eq("hole_id", hole.hole_id)
        .select("id");

      if (updateHoleError) {
        throw new Error(updateHoleError.message);
      }

      if (!updatedHoles || updatedHoles.length === 0) {
        throw new Error("No round_holes row was updated.");
      }

      updateScorecardHole(hole.hole_number, {
        score,
        completed: true,
      });

      const hasNextHole = moveToNextHole(hole.hole_number);
      if (!hasNextHole) {
        await calculateAndSaveRoundSG(roundId);

        const { error: finalizeRoundError } = await supabase
          .from("rounds")
          .update({ is_finalised: true })
          .eq("id", roundId);

        if (finalizeRoundError) {
          throw new Error(finalizeRoundError.message);
        }

        setRoundCompleted(true);
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      setEntryError(`Failed to complete hole: ${message}`);
      return false;
    } finally {
      setSavingHole(false);
    }
  };

  onMount(() => {
    void loadScorecard();

    const handleWindowFocus = () => {
      void loadScorecard();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadScorecard();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    onCleanup(() => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    });
  });

  return (
    <div class='mx-auto w-full max-w-5xl space-y-4'>
      <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <div class='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 class='font-rubik text-2xl font-semibold text-slate-800'>
              Score Entry
            </h1>
            <p class='mt-1 text-sm text-slate-500'>
              {roundHeader().courseName
                ? `${roundHeader().courseName} - ${roundHeader().teeColor}`
                : `Round ${Number.isNaN(roundId) ? props.id : roundId}`}
            </p>
          </div>
          <A
            href='/dashboard'
            class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
          >
            Back to Dashboard
          </A>
        </div>
        <div class='mt-3'>
          <button
            type='button'
            onClick={() => void loadScorecard()}
            class='inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100'
          >
            Refresh Scorecard
          </button>
        </div>

        <Show
          when={!loading()}
          fallback={
            <div class='mt-4 text-sm text-slate-500'>Loading scorecard...</div>
          }
        >
          <Show
            when={!loadError()}
            fallback={
              <p class='mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>
                {loadError()}
              </p>
            }
          >
            <div class='mt-4 flex items-center gap-2'>
              <button
                type='button'
                class={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                  activeNine() === "front" ? activeButtonClass : inactiveButtonClass
                }`}
                onClick={() => setNine("front")}
              >
                Front 9
              </button>
              <button
                type='button'
                class={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                  activeNine() === "back" ? activeButtonClass : inactiveButtonClass
                }`}
                onClick={() => setNine("back")}
              >
                Back 9
              </button>
            </div>

            <div class='mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-3'>
              {activeNine() === "front" ? (
                <FrontNineTable
                  holes={frontNine()}
                  distanceUnit={distanceUnit()}
                />
              ) : (
                <BackNineTable
                  holes={backNine()}
                  distanceUnit={distanceUnit()}
                />
              )}
            </div>
          </Show>
        </Show>
      </div>

      <Show when={selectedHole()}>
        {(hole) => (
          <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
            <div class='mb-4 flex flex-wrap items-center justify-between gap-3'>
              <div class='flex w-full items-center justify-between gap-3'>
                <h2 class='font-rubik text-lg font-semibold text-slate-800'>
                  Hole {hole().hole_number}
                </h2>
                <p class='text-sm text-slate-500'>
                  Par {hole().par} |{" "}
                  {formatMetresForDisplay(
                    hole().distanceMetres,
                    distanceUnit(),
                  )}
                </p>
              </div>
            </div>

            <Show
              when={!roundCompleted()}
              fallback={
                <div class='rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center'>
                  <h3 class='font-rubik text-xl font-semibold text-emerald-800'>
                    Round completed
                  </h3>
                  <p class='mt-2 text-sm text-emerald-700'>
                    All 18 holes have been saved successfully.
                  </p>
                  <A
                    href='/dashboard'
                    class='mt-4 inline-flex rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100'
                  >
                    Return to Dashboard
                  </A>
                </div>
              }
            >
              <LocalShotPanel
                distanceUnit={distanceUnit()}
                entryError={entryError()}
                hole={hole()}
                onCompleteHole={persistCompletedHole}
                savingHole={savingHole()}
              />
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
