import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { A, Params } from "@solidjs/router";

import { supabase } from "../../supabase/client";
import ShotEntry from "./ShotEntry";
import FrontNineTable from "./FrontNineTable";
import BackNineTable from "./BackNineTable";

type LieType = "TEE" | "FAIRWAY" | "ROUGH" | "BUNKER" | "GREEN" | "RECOVERY";

type ScorecardHole = {
  hole_round_id: number;
  hole_number: number;
  par: number;
  yardage: number;
  strokes: number | null;
  completed?: boolean;
};

type CourseTee = {
  name: string;
  colour: string;
};

const normalizeLie = (value?: string | null): LieType => {
  const v = (value ?? "").toUpperCase();
  if (v === "TEE") return "TEE";
  if (v === "FAIRWAY") return "FAIRWAY";
  if (v === "ROUGH") return "ROUGH";
  if (v === "BUNKER") return "BUNKER";
  if (v === "GREEN") return "GREEN";
  return "RECOVERY";
};

export default function ScorecardEntry(props: { id: string }) {
  const params = props as Params;
  const roundId = Number(params.id);

  const [scorecard, setScorecard] = createSignal<ScorecardHole[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [loadError, setLoadError] = createSignal<string | null>(null);
  const [courseTee, setCourseTee] = createSignal<CourseTee>({
    name: "",
    colour: "",
  });
  const [activeNine, setActiveNine] = createSignal<"front" | "back">("front");
  const [selectedHoleRoundId, setSelectedHoleRoundId] = createSignal<
    number | null
  >(null);

  const [shotContextLoading, setShotContextLoading] = createSignal(false);
  const [nextShotNumber, setNextShotNumber] = createSignal(1);
  const [startDistance, setStartDistance] = createSignal(0);
  const [startLie, setStartLie] = createSignal<LieType>("TEE");

  // display the course and the tee
  const loadCourseDetails = async () => {
    const { data, error } = await supabase.rpc("get_course_and_tee", {
      p_round_id: roundId,
    });

    if (error || !data?.length) return;

    setCourseTee({
      name: data[0].course_name,
      colour: data[0].tee_color,
    });
  };

  const loadScorecard = async () => {
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase.rpc("get_scorecard", {
      p_round_id: roundId,
    });

    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const { data: holeRoundProgress, error: progressError } = await supabase
      .from("hole_round")
      .select("id, strokes, completed")
      .eq("round_id", roundId);

    if (progressError) {
      setLoadError(progressError.message);
      setLoading(false);
      return;
    }

    const progressByHoleRoundId = new Map(
      (holeRoundProgress ?? []).map((row: any) => [
        Number(row.id),
        {
          strokes: row.strokes == null ? 0 : Number(row.strokes),
          completed: Boolean(row.completed),
        },
      ]),
    );

    const rows = (data ?? []).map(
      (r: any): ScorecardHole => ({
        hole_round_id: Number(r.hole_round_id),
        hole_number: Number(r.hole_number),
        par: Number(r.par),
        yardage: Number(r.yardage),
        strokes:
          progressByHoleRoundId.get(Number(r.hole_round_id))?.strokes ??
          (r.strokes == null ? 0 : Number(r.strokes)),
        completed:
          progressByHoleRoundId.get(Number(r.hole_round_id))?.completed ??
          Boolean(r.completed),
      }),
    );

    rows.sort((a, b) => a.hole_number - b.hole_number);
    setScorecard(rows);
    setLoading(false);
  };

  const loadShotContext = async (hole: ScorecardHole | undefined) => {
    if (!hole) return;

    setShotContextLoading(true);

    const { data, error } = await supabase
      .from("shotslies")
      .select("shot_number, distance_to_pin, lie_type, holed_out")
      .eq("hole_round_id", hole.hole_round_id)
      .order("shot_number", { ascending: false })
      .limit(1);

    if (error) {
      setShotContextLoading(false);
      return;
    }

    const last = data?.[0];
    if (!last) {
      setNextShotNumber(1);
      setStartDistance(hole.yardage || 0);
      setStartLie(hole.par === 3 ? "FAIRWAY" : "TEE");
      setShotContextLoading(false);
      return;
    }

    if (last.holed_out) {
      setNextShotNumber(Number(last.shot_number) + 1);
      setStartDistance(0);
      setStartLie("GREEN");
      setShotContextLoading(false);
      return;
    }

    setNextShotNumber(Number(last.shot_number) + 1);
    setStartDistance(Number(last.distance_to_pin) || 0);
    setStartLie(normalizeLie(last.lie_type));
    setShotContextLoading(false);
  };

  createEffect(() => {
    void loadScorecard();
    void loadCourseDetails();
  });

  const front9 = createMemo(() =>
    scorecard().filter((h) => h.hole_number <= 9),
  );
  const back9 = createMemo(() =>
    scorecard().filter((h) => h.hole_number >= 10),
  );
  const orderedHoles = createMemo(() =>
    scorecard()
      .slice()
      .sort((a, b) => a.hole_number - b.hole_number),
  );
  const nextPlayableHole = createMemo(() => {
    const ordered = orderedHoles();
    if (!ordered.length) return undefined;
    return ordered.find((h) => !h.completed) ?? ordered[ordered.length - 1];
  });
  const playableHoleId = createMemo(
    () => nextPlayableHole()?.hole_round_id ?? null,
  );
  const visibleHoles = createMemo(() =>
    activeNine() === "front" ? front9() : back9(),
  );

  createEffect(() => {
    const playable = nextPlayableHole();
    if (!playable) return;

    setActiveNine(playable.hole_number <= 9 ? "front" : "back");
    if (selectedHoleRoundId() !== playable.hole_round_id) {
      setSelectedHoleRoundId(playable.hole_round_id);
    }
  });

  const selectedHole = createMemo(() =>
    scorecard().find((h) => h.hole_round_id === selectedHoleRoundId()),
  );

  createEffect(() => {
    const hole = selectedHole();
    if (!hole) return;
    void loadShotContext(hole);
  });

  const handleShotSaved = async () => {
    await loadScorecard();
  };

  const handleHoledOut = async () => {
    await loadScorecard();
  };

  return (
    <div class='mx-auto w-full max-w-5xl space-y-4'>
      <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <div class='flex flex-wrap items-center justify-between gap-2'>
          <h1 class='font-rubik text-2xl font-semibold text-slate-800'>
            Score Entry
          </h1>
          <div class='flex items-center gap-2'>
            <p class='font-grotesk text-sm text-slate-500'>
              {courseTee().name
                ? `${courseTee().name} - ${courseTee().colour}`
                : "Loading round..."}
            </p>
            <A
              href='/dashboard'
              class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
            >
              Back to Dashboard
            </A>
          </div>
        </div>

        <div class='mt-4 flex items-center gap-2'>
          <button
            type='button'
            class={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
              activeNine() === "front"
                ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => setActiveNine("front")}
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
            onClick={() => setActiveNine("back")}
          >
            Back 9
          </button>
        </div>

        <Show
          when={!loading()}
          fallback={<div class='mt-4 text-sm text-slate-500'>Loading...</div>}
        >
          <Show
            when={!loadError()}
            fallback={
              <p class='mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                {loadError()}
              </p>
            }
          >
            <div class='mt-4 overflow-x-auto'>
              <Show
                when={activeNine() === "front"}
                fallback={<BackNineTable holes={back9()} />}
              >
                <FrontNineTable holes={front9()} />
              </Show>
            </div>

            <div class='mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5'>
              <For each={visibleHoles()}>
                {(hole) => (
                  <button
                    type='button'
                    class={`rounded-md border px-2 py-2 text-left text-xs font-semibold ${
                      selectedHoleRoundId() === hole.hole_round_id
                        ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                        : hole.hole_round_id === playableHoleId()
                          ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    }`}
                    disabled={hole.hole_round_id !== playableHoleId()}
                    onClick={() => {
                      if (hole.hole_round_id !== playableHoleId()) return;
                      setSelectedHoleRoundId(hole.hole_round_id);
                    }}
                  >
                    H{hole.hole_number}{" "}
                    {hole.strokes ? `(${hole.strokes})` : ""}
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
            <div class='mb-3 flex items-center justify-between'>
              <h2 class='font-rubik text-lg font-semibold text-slate-800'>
                Hole {hole().hole_number}
              </h2>
              <p class='text-sm text-slate-500'>
                Par {hole().par} | {hole().yardage} yds
              </p>
            </div>

            <Show
              when={!shotContextLoading()}
              fallback={
                <p class='text-sm text-slate-500'>Loading shot context...</p>
              }
            >
              <ShotEntry
                holeRoundId={hole().hole_round_id}
                holePar={hole().par}
                nextShotNumber={nextShotNumber()}
                startDistance={startDistance()}
                startLie={startLie()}
                onShotSaved={handleShotSaved}
              />
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
