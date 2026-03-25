import { createResource, For, Show } from "solid-js";
import { A } from "@solidjs/router";

import { useAuth } from "../context/AuthProvider";
import {
  convertMetresToUnit,
  normalizeDistanceUnit,
} from "../lib/distance";
import { supabase } from "../supabase/client";

type RoundHoleRow = {
  id: number;
  score: number | null;
  holes:
    | {
        hole_number: number;
      }
    | {
        hole_number: number;
      }[]
    | null;
};

type ShotRow = {
  id: number;
  round_hole_id: number;
  shot_number: number;
  distance_to_pin: number;
  lie_type: string;
  penalty_strokes: number | null;
  sg_value: number | null;
};

type RoundHeaderRow = {
  round_date: string;
  courses:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
  tees:
    | {
        color: string;
      }
    | {
        color: string;
      }[]
    | null;
};

type RoundShotItem = {
  id: number;
  holeNumber: number;
  shotNumber: number;
  distanceToPin: number;
  lieType: string;
  penaltyStrokes: number;
  score: number | null;
  sgValue: number | null;
};

type RoundShotsData = {
  courseName: string;
  roundDate: string;
  teeColor: string;
  shots: RoundShotItem[];
};

const getSingleRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const FEET_TO_METRES = 0.3048;

const formatGreenDistanceForDisplay = (
  feet: number,
  unit: ReturnType<typeof normalizeDistanceUnit>,
) => {
  if (unit === "yards") {
    return `${Math.round(feet)} ft`;
  }

  const metres = Math.round(feet * FEET_TO_METRES * 2) / 2;
  return `${Number.isInteger(metres) ? metres.toFixed(0) : metres.toFixed(1)} m`;
};

const fetchRoundShots = async (roundId: number): Promise<RoundShotsData> => {
  const { data: roundHeader, error: roundHeaderError } = await supabase
    .from("rounds")
    .select("round_date, courses(name), tees(color)")
    .eq("id", roundId)
    .single();

  if (roundHeaderError || !roundHeader) {
    throw new Error(
      roundHeaderError?.message ?? "Failed to load round details.",
    );
  }

  const { data: roundHoleRows, error: roundHolesError } = await supabase
    .from("round_holes")
    .select("id, score, holes(hole_number)")
    .eq("round_id", roundId)
    .order("id", { ascending: true });

  if (roundHolesError) {
    throw new Error(roundHolesError.message);
  }

  const holeInfoByRoundHoleId = new Map<number, { holeNumber: number; score: number | null }>();
  for (const row of (roundHoleRows ?? []) as RoundHoleRow[]) {
    const hole = getSingleRelation(row.holes);
    if (!hole) continue;

    holeInfoByRoundHoleId.set(Number(row.id), {
      holeNumber: Number(hole.hole_number),
      score: row.score == null ? null : Number(row.score),
    });
  }

  const roundHoleIds = Array.from(holeInfoByRoundHoleId.keys());
  if (roundHoleIds.length === 0) {
    return {
      courseName: getSingleRelation((roundHeader as RoundHeaderRow).courses)?.name ?? "Unknown course",
      roundDate: (roundHeader as RoundHeaderRow).round_date ?? "",
      teeColor: getSingleRelation((roundHeader as RoundHeaderRow).tees)?.color ?? "Unknown tee",
      shots: [],
    };
  }

  const { data: shotRows, error: shotsError } = await supabase
    .from("shots")
    .select(
      "id, round_hole_id, shot_number, distance_to_pin, lie_type, penalty_strokes, sg_value",
    )
    .in("round_hole_id", roundHoleIds)
    .order("round_hole_id", { ascending: true })
    .order("shot_number", { ascending: true });

  if (shotsError) {
    throw new Error(shotsError.message);
  }

  const shots = ((shotRows ?? []) as ShotRow[])
    .map((shot) => {
      const holeInfo = holeInfoByRoundHoleId.get(Number(shot.round_hole_id));
      if (!holeInfo) return null;

      return {
        id: Number(shot.id),
        holeNumber: holeInfo.holeNumber,
        shotNumber: Number(shot.shot_number),
        distanceToPin: Number(shot.distance_to_pin),
        lieType: shot.lie_type,
        penaltyStrokes:
          shot.penalty_strokes == null ? 0 : Number(shot.penalty_strokes),
        score: holeInfo.score,
        sgValue: shot.sg_value == null ? null : Number(shot.sg_value),
      } satisfies RoundShotItem;
    })
    .filter((shot): shot is RoundShotItem => shot !== null)
    .sort((a, b) =>
      a.holeNumber === b.holeNumber
        ? a.shotNumber - b.shotNumber
        : a.holeNumber - b.holeNumber,
    );

  return {
    courseName: getSingleRelation((roundHeader as RoundHeaderRow).courses)?.name ?? "Unknown course",
    roundDate: (roundHeader as RoundHeaderRow).round_date ?? "",
    teeColor: getSingleRelation((roundHeader as RoundHeaderRow).tees)?.color ?? "Unknown tee",
    shots,
  };
};

export default function RoundShots(props: { id: string }) {
  const roundId = Number(props.id);
  const { profile } = useAuth();
  const [roundShots] = createResource(
    () => (Number.isNaN(roundId) ? null : roundId),
    async (id) => fetchRoundShots(id),
  );
  const distanceUnit = () =>
    normalizeDistanceUnit(profile()?.preferred_distance_unit);
  const formatShotDistance = (shot: RoundShotItem) => {
    if (shot.lieType === "Green") {
      return formatGreenDistanceForDisplay(
        shot.distanceToPin,
        distanceUnit(),
      );
    }

    if (distanceUnit() === "yards") {
      return `${convertMetresToUnit(shot.distanceToPin, "yards")} yds`;
    }

    return `${Math.round(shot.distanceToPin)} m`;
  };

  return (
    <div class='mx-auto w-full max-w-6xl space-y-4'>
      <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <div class='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 class='font-rubik text-2xl font-semibold text-slate-800'>
              Round Shots
            </h1>
            <Show when={roundShots()}>
              {(data) => (
                <p class='mt-1 text-sm text-slate-500'>
                  {data().courseName} - {data().teeColor} - {data().roundDate}
                </p>
              )}
            </Show>
          </div>
          <A
            href='/dashboard/rounds'
            class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
          >
            Back to Rounds
          </A>
        </div>

        <Show
          when={!roundShots.loading}
          fallback={<div class='mt-4 text-sm text-slate-500'>Loading shots...</div>}
        >
          <Show
            when={!roundShots.error}
            fallback={
              <p class='mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>
                {roundShots.error instanceof Error
                  ? roundShots.error.message
                  : "Failed to load round shots."}
              </p>
            }
          >
            <Show
              when={(roundShots()?.shots.length ?? 0) > 0}
              fallback={
                <p class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>
                  No shots found for this round.
                </p>
              }
            >
              <div class='mt-4 overflow-x-auto rounded-xl border border-slate-200'>
                <table class='w-full min-w-160 text-left text-sm text-slate-700'>
                  <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
                    <tr>
                      <th class='px-4 py-3 font-semibold'>Hole</th>
                      <th class='px-4 py-3 font-semibold'>Shot</th>
                      <th class='px-4 py-3 font-semibold'>Distance</th>
                      <th class='px-4 py-3 font-semibold'>Lie Type</th>
                      <th class='px-4 py-3 font-semibold'>Penalty</th>
                      <th class='px-4 py-3 font-semibold'>Score</th>
                      <th class='px-4 py-3 font-semibold'>SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={roundShots()?.shots}>
                      {(shot) => (
                        <tr class='border-b border-slate-100 last:border-b-0'>
                          <td class='px-4 py-3'>{shot.holeNumber}</td>
                          <td class='px-4 py-3'>{shot.shotNumber}</td>
                          <td class='px-4 py-3'>
                            {formatShotDistance(shot)}
                          </td>
                          <td class='px-4 py-3'>{shot.lieType}</td>
                          <td class='px-4 py-3'>{shot.penaltyStrokes}</td>
                          <td class='px-4 py-3'>{shot.score ?? "-"}</td>
                          <td class='px-4 py-3'>
                            {shot.sgValue == null ? "-" : shot.sgValue.toFixed(3)}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
