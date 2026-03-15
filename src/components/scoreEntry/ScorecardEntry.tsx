import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { A, Params } from "@solidjs/router";

import { supabase } from "../../supabase/client";
import BackNineTable from "./BackNineTable";
import FrontNineTable from "./FrontNineTable";
import ShotEntry from "./ShotEntry";

type ScorecardHole = {
  round_hole_id: number;
  hole_number: number;
  par: number;
  yardage: number;
  score: number | null;
  completed: boolean;
};

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

/*
T is a generic type, meaning “whatever object shape you expect”
if value is an array, it returns the first item
if the array is empty, it returns null
if value is already a single object, it returns that object
if value is null or undefined, it returns null
*/
const getSingleRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export default function ScorecardEntry(props: { id: string }) {
  const params = props as Params;
  const roundId = Number(params.id);

  const [activeNine, setActiveNine] = createSignal<"front" | "back">("front");
  const [selectedHoleNumber, setSelectedHoleNumber] = createSignal(1);
  const [scorecard, setScorecard] = createSignal<ScorecardHole[]>([]);
  const [roundHeader, setRoundHeader] = createSignal<RoundHeader>(emptyHeader);
  const [loading, setLoading] = createSignal(true);
  const [loadError, setLoadError] = createSignal<string | null>(null);

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
    // get the info for the scorecard
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
          hole_number: Number(hole.hole_number),
          par: Number(hole.par),
          yardage: yardageByHoleId.get(Number(row.hole_id)) ?? 0,
          score: row.score == null ? null : Number(row.score),
          completed: Boolean(row.completed),
        } satisfies ScorecardHole;
      })
      .filter((row): row is ScorecardHole => row !== null)
      .sort((a, b) => a.hole_number - b.hole_number);

    setScorecard(rows);
    if (rows.length > 0) {
      const firstHole = rows[0];
      setActiveNine(firstHole.hole_number <= 9 ? "front" : "back");
      setSelectedHoleNumber(firstHole.hole_number);
    }
    setLoading(false);
  };

  onMount(() => {
    void loadScorecard();
  });

  const frontNine = createMemo(() =>
    scorecard().filter((hole) => hole.hole_number <= 9),
  );
  const backNine = createMemo(() =>
    scorecard().filter((hole) => hole.hole_number >= 10),
  );
  const visibleHoles = createMemo(() =>
    activeNine() === "front" ? frontNine() : backNine(),
  );
  const selectedHole = createMemo(
    () =>
      scorecard().find((hole) => hole.hole_number === selectedHoleNumber()) ??
      scorecard()[0],
  );

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
                  activeNine() === "front"
                    ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => {
                  setActiveNine("front");
                  if (frontNine()[0])
                    setSelectedHoleNumber(frontNine()[0].hole_number);
                }}
              >
                Front 9
              </button>
              <button
                type='button'
                class={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                  activeNine() === "back"
                    ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => {
                  setActiveNine("back");
                  if (backNine()[0])
                    setSelectedHoleNumber(backNine()[0].hole_number);
                }}
              >
                Back 9
              </button>
            </div>

            <div class='mt-4 overflow-x-auto'>
              {activeNine() === "front" ? (
                <FrontNineTable holes={frontNine()} />
              ) : (
                <BackNineTable holes={backNine()} />
              )}
            </div>

            <div class='mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5'>
              <For each={visibleHoles()}>
                {(hole) => (
                  <button
                    type='button'
                    class={`rounded-md border px-2 py-2 text-left text-xs font-semibold ${
                      selectedHoleNumber() === hole.hole_number
                        ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedHoleNumber(hole.hole_number)}
                  >
                    H{hole.hole_number}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>

      <Show when={selectedHole()}>
        {(hole) => (
          <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
            <div class='mb-4 flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h2 class='font-rubik text-lg font-semibold text-slate-800'>
                  Hole {hole().hole_number}
                </h2>
                <p class='text-sm text-slate-500'>
                  Par {hole().par} | {hole().yardage} yds
                </p>
              </div>
            </div>

            <ShotEntry
              holeNumber={hole().hole_number}
              par={hole().par}
              yardage={hole().yardage}
            />
          </div>
        )}
      </Show>
    </div>
  );
}
