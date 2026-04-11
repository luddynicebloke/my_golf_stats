import { createResource, createSignal, For, Show } from "solid-js";
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
  recovery: boolean | null;
  holed_out: boolean | null;
  sg_value: number | null;
};

type RoundHeaderRow = {
  round_date: string;
  part_finalised: boolean | null;
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
  roundHoleId: number;
  shotNumber: number;
  distanceToPin: number;
  lieType: string;
  holedOut: boolean;
  penaltyStrokes: number;
  recovery: boolean;
  score: number | null;
  sgValue: number | null;
};

type RoundShotsData = {
  courseName: string;
  partFinalised: boolean;
  roundDate: string;
  teeColor: string;
  shots: RoundShotItem[];
};

type FinaliseRoundResponse = {
  part_finalised: boolean;
  round_finalised: boolean;
  round_id: number;
  updated_shot_count: number;
};

type EditableLieType = "Tee" | "Fairway" | "Rough" | "Bunker" | "Green";

type ShotFormState = {
  distanceToPin: string;
  holedOut: boolean;
  lieType: EditableLieType;
  penaltyStrokes: string;
  recovery: boolean;
};

const getSingleRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const FEET_TO_METRES = 0.3048;
const METRES_TO_FEET = 3.28084;
const editableLieTypes: EditableLieType[] = [
  "Tee",
  "Fairway",
  "Rough",
  "Bunker",
  "Green",
];

const normalizeLieType = (lieType: string): EditableLieType =>
  editableLieTypes.find(
    (value) => value.toLowerCase() === lieType.trim().toLowerCase(),
  ) ?? "Fairway";

const formatEditableDistance = (
  shot: RoundShotItem,
  unit: ReturnType<typeof normalizeDistanceUnit>,
) => {
  if (shot.lieType === "Green") {
    if (unit === "yards") {
      return Math.round(shot.distanceToPin).toString();
    }

    const metres = Math.round(shot.distanceToPin * FEET_TO_METRES * 2) / 2;
    return metres.toString();
  }

  return convertMetresToUnit(shot.distanceToPin, unit).toString();
};

const convertDisplayDistanceToStored = (
  distance: number,
  lieType: EditableLieType,
  unit: ReturnType<typeof normalizeDistanceUnit>,
) => {
  if (lieType === "Green") {
    if (unit === "yards") {
      return Math.round(distance);
    }

    return Math.round(distance * METRES_TO_FEET);
  }

  if (unit === "yards") {
    return Math.round(distance / 1.09361);
  }

  return Math.round(distance);
};

const getHoleScoreFromShots = (shots: Pick<RoundShotItem, "penaltyStrokes">[]) =>
  shots.reduce((total, shot) => total + 1 + shot.penaltyStrokes, 0);

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
    .select("round_date, part_finalised, courses(name), tees(color)")
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
      partFinalised: Boolean((roundHeader as RoundHeaderRow).part_finalised),
      roundDate: (roundHeader as RoundHeaderRow).round_date ?? "",
      teeColor: getSingleRelation((roundHeader as RoundHeaderRow).tees)?.color ?? "Unknown tee",
      shots: [],
    };
  }

  const { data: shotRows, error: shotsError } = await supabase
    .from("shots")
    .select(
      "id, round_hole_id, shot_number, distance_to_pin, lie_type, penalty_strokes, recovery, holed_out, sg_value",
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
        roundHoleId: Number(shot.round_hole_id),
        shotNumber: Number(shot.shot_number),
        distanceToPin: Number(shot.distance_to_pin),
        holedOut: Boolean(shot.holed_out),
        lieType: shot.lie_type,
        penaltyStrokes:
          shot.penalty_strokes == null ? 0 : Number(shot.penalty_strokes),
        recovery: Boolean(shot.recovery),
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
    partFinalised: Boolean((roundHeader as RoundHeaderRow).part_finalised),
    roundDate: (roundHeader as RoundHeaderRow).round_date ?? "",
    teeColor: getSingleRelation((roundHeader as RoundHeaderRow).tees)?.color ?? "Unknown tee",
    shots,
  };
};

export default function RoundShots(props: { id: string }) {
  const roundId = Number(props.id);
  const { profile } = useAuth();
  const [roundShots, { refetch }] = createResource(
    () => (Number.isNaN(roundId) ? null : roundId),
    async (id) => fetchRoundShots(id),
  );
  const [editingShotId, setEditingShotId] = createSignal<number | null>(null);
  const [editError, setEditError] = createSignal<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = createSignal(false);
  const [shotForm, setShotForm] = createSignal<ShotFormState | null>(null);
  const distanceUnit = () =>
    normalizeDistanceUnit(profile()?.preferred_distance_unit);

  const startEditingShot = (shot: RoundShotItem) => {
    setEditError(null);
    setEditingShotId(shot.id);
    setShotForm({
      distanceToPin: formatEditableDistance(shot, distanceUnit()),
      holedOut: shot.holedOut,
      lieType: normalizeLieType(shot.lieType),
      penaltyStrokes: shot.penaltyStrokes.toString(),
      recovery: shot.recovery,
    });
  };

  const closeEditModal = () => {
    setEditingShotId(null);
    setShotForm(null);
    setEditError(null);
  };

  const updateShotForm = (updates: Partial<ShotFormState>) => {
    setShotForm((current) =>
      current == null ? current : { ...current, ...updates },
    );
  };

  const saveShotEdit = async () => {
    const shots = roundShots()?.shots ?? [];
    const shotId = editingShotId();
    const form = shotForm();

    if (shotId == null || form == null) {
      return;
    }

    const currentShot = shots.find((shot) => shot.id === shotId);
    if (!currentShot) {
      setEditError("Unable to find the selected shot.");
      return;
    }

    const parsedDistance = Number(form.distanceToPin);
    const parsedPenaltyStrokes = Number(form.penaltyStrokes);

    if (!Number.isFinite(parsedDistance) || parsedDistance <= 0) {
      setEditError("Enter a valid distance greater than 0.");
      return;
    }

    if (!Number.isInteger(parsedPenaltyStrokes) || parsedPenaltyStrokes < 0) {
      setEditError("Penalty strokes must be a whole number of 0 or more.");
      return;
    }

    setEditError(null);
    setIsSavingEdit(true);

    try {
      const storedDistance = convertDisplayDistanceToStored(
        parsedDistance,
        form.lieType,
        distanceUnit(),
      );

      const { error: updateShotError } = await supabase
        .from("shots")
        .update({
          distance_to_pin: storedDistance,
          holed_out: form.holedOut,
          lie_type: form.lieType,
          penalty_strokes: parsedPenaltyStrokes,
          recovery: form.recovery,
        })
        .eq("id", shotId);

      if (updateShotError) {
        throw new Error(updateShotError.message);
      }

      const updatedShotsForHole = shots
        .filter((shot) => shot.roundHoleId === currentShot.roundHoleId)
        .map((shot) =>
          shot.id === shotId
            ? {
                ...shot,
                distanceToPin: storedDistance,
                holedOut: form.holedOut,
                lieType: form.lieType,
                penaltyStrokes: parsedPenaltyStrokes,
                recovery: form.recovery,
              }
            : shot,
        );

      const { error: updateHoleError } = await supabase
        .from("round_holes")
        .update({
          score: getHoleScoreFromShots(updatedShotsForHole),
        })
        .eq("id", currentShot.roundHoleId);

      if (updateHoleError) {
        throw new Error(updateHoleError.message);
      }

      const { data: finaliseResult, error: finaliseError } = await supabase
        .rpc("finalise_round_with_sg", {
          p_part_finalised: Boolean(roundShots()?.partFinalised),
          p_round_id: roundId,
        })
        .single<FinaliseRoundResponse>();

      if (finaliseError) {
        throw new Error(finaliseError.message);
      }

      if (!finaliseResult?.round_finalised) {
        throw new Error("Failed to recalculate strokes gained for this round.");
      }

      await refetch();
      closeEditModal();
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Failed to update shot.",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

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
      <Show when={editingShotId() != null && shotForm()}>
        <div
          class='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
          onClick={closeEditModal}
        >
          <div
            class='w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl'
            onClick={(event) => event.stopPropagation()}
          >
            <h2 class='font-rubik text-xl font-semibold text-slate-900'>
              Edit Shot
            </h2>
            <p class='mt-1 text-sm text-slate-500'>
              Update the shot details and recalculate strokes gained for the round.
            </p>

            <Show when={shotForm()}>
              {(form) => (
                <div class='mt-5 space-y-4'>
                  <div>
                    <label
                      for='edit-shot-lie-type'
                      class='mb-1 block text-sm font-medium text-slate-700'
                    >
                      Lie type
                    </label>
                    <select
                      id='edit-shot-lie-type'
                      class='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800'
                      value={form().lieType}
                      onChange={(event) =>
                        updateShotForm({
                          lieType: event.currentTarget.value as EditableLieType,
                        })
                      }
                    >
                      <For each={editableLieTypes}>
                        {(lieType) => <option value={lieType}>{lieType}</option>}
                      </For>
                    </select>
                  </div>

                  <div class='grid gap-4 sm:grid-cols-2'>
                    <div>
                      <label
                        for='edit-shot-distance'
                        class='mb-1 block text-sm font-medium text-slate-700'
                      >
                        Distance to pin
                      </label>
                      <input
                        id='edit-shot-distance'
                        type='number'
                        min='0'
                        step={form().lieType === "Green" && distanceUnit() === "metres" ? "0.5" : "1"}
                        class='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800'
                        value={form().distanceToPin}
                        onInput={(event) =>
                          updateShotForm({
                            distanceToPin: event.currentTarget.value,
                          })
                        }
                      />
                      <p class='mt-1 text-xs text-slate-500'>
                        {form().lieType === "Green"
                          ? distanceUnit() === "yards"
                            ? "Stored as feet for green shots."
                            : "Enter green distance in metres."
                          : distanceUnit() === "yards"
                            ? "Enter distance in yards."
                            : "Enter distance in metres."}
                      </p>
                    </div>

                    <div>
                      <label
                        for='edit-shot-penalty'
                        class='mb-1 block text-sm font-medium text-slate-700'
                      >
                        Penalty strokes
                      </label>
                      <input
                        id='edit-shot-penalty'
                        type='number'
                        min='0'
                        step='1'
                        class='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800'
                        value={form().penaltyStrokes}
                        onInput={(event) =>
                          updateShotForm({
                            penaltyStrokes: event.currentTarget.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div class='flex flex-wrap gap-3'>
                    <label class='flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700'>
                      <input
                        type='checkbox'
                        checked={form().recovery}
                        onChange={(event) =>
                          updateShotForm({ recovery: event.currentTarget.checked })
                        }
                      />
                      Recovery
                    </label>
                    <label class='flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700'>
                      <input
                        type='checkbox'
                        checked={form().holedOut}
                        onChange={(event) =>
                          updateShotForm({ holedOut: event.currentTarget.checked })
                        }
                      />
                      Holed out
                    </label>
                  </div>

                  <Show when={editError()}>
                    {(message) => (
                      <p class='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                        {message()}
                      </p>
                    )}
                  </Show>

                  <div class='flex flex-wrap justify-end gap-3'>
                    <button
                      type='button'
                      class='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                      onClick={closeEditModal}
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      class='rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60'
                      disabled={isSavingEdit()}
                      onClick={() => void saveShotEdit()}
                    >
                      {isSavingEdit() ? "Saving..." : "Save and Recalculate"}
                    </button>
                  </div>
                </div>
              )}
            </Show>
          </div>
        </div>
      </Show>

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
                      <th class='px-4 py-3 font-semibold'>Action</th>
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
                          <td class='px-4 py-3'>
                            <button
                              type='button'
                              class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
                              onClick={() => startEditingShot(shot)}
                            >
                              Edit
                            </button>
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
