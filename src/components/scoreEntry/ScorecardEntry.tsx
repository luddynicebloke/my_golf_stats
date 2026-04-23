import { createMemo, createSignal, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import { useTransContext } from "@mbarzda/solid-i18next";

import { useAuth } from "../../context/AuthProvider";
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
  isFinalised: boolean;
  partFinalised: boolean;
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

type SaveStage = "savingHole" | "calculatingSg" | "finalisingRound" | null;

type FinaliseRoundResponse = {
  round_id: number;
  updated_shot_count: number;
  round_finalised: boolean;
  part_finalised: boolean;
};

const emptyHeader: RoundHeader = {
  courseName: "",
  teeColor: "",
  isFinalised: false,
  partFinalised: false,
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

const isAbortLikeError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.message.includes("AbortError") ||
    error.message.includes("signal is aborted without reason")
  );
};

export default function ScorecardEntry(props: { id: string }) {
  const roundId = Number(props.id);
  const { profile } = useAuth();
  const [t] = useTransContext();
  let latestLoadRequestId = 0;

  const [activeNine, setActiveNine] = createSignal<"front" | "back">("front");
  const [selectedHoleNumber, setSelectedHoleNumber] = createSignal(1);
  const [scorecard, setScorecard] = createSignal<ScorecardHole[]>([]);
  const [roundHeader, setRoundHeader] = createSignal<RoundHeader>(emptyHeader);
  const [loading, setLoading] = createSignal(true);
  const [loadError, setLoadError] = createSignal<string | null>(null);
  const [entryError, setEntryError] = createSignal<string | null>(null);
  const [savingHole, setSavingHole] = createSignal(false);
  const [saveStage, setSaveStage] = createSignal<SaveStage>(null);
  const [savedShotsByHoleNumber, setSavedShotsByHoleNumber] = createSignal<
    Record<number, LocalShot[]>
  >({});
  const [updatingRoundStatus, setUpdatingRoundStatus] = createSignal(false);

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
  const roundFinalised = createMemo(() => roundHeader().isFinalised);
  const allHolesCompleted = createMemo(
    () => scorecard().length > 0 && scorecard().every((hole) => hole.completed),
  );
  const canEditSelectedHole = createMemo(() => !roundFinalised());
  const saveStageLabel = createMemo(() => {
    switch (saveStage()) {
      case "savingHole":
        return t("scoreEntry.savingHole");
      case "calculatingSg":
        return t("scoreEntry.calculatingSg");
      case "finalisingRound":
        return t("scoreEntry.finalisingRound");
      default:
        return t("common.saving");
    }
  });

  const setNine = (nine: "front" | "back") => {
    setActiveNine(nine);
  };

  const loadScorecard = async () => {
    const requestId = ++latestLoadRequestId;

    if (Number.isNaN(roundId)) {
      setLoadError(t("scoreEntry.errors.invalidRound"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const { data: round, error: roundError } = await supabase
        .from("rounds")
        .select("tee_id, is_finalised, part_finalised, courses(name), tees(color)")
        .eq("id", roundId)
        .single();

      if (requestId !== latestLoadRequestId) return;

      if (isAbortLikeError(roundError)) {
        setLoading(false);
        return;
      }

      if (roundError || !round) {
        setLoadError(roundError?.message ?? t("scoreEntry.errors.loadRound"));
        setLoading(false);
        return;
      }

      const course = getSingleRelation<{ name: string }>(round.courses);
      const tee = getSingleRelation<{ color: string }>(round.tees);

      setRoundHeader({
        courseName: course?.name ?? "",
        teeColor: tee?.color ?? "",
        isFinalised: Boolean(round.is_finalised),
        partFinalised: Boolean(round.part_finalised),
      });

      const teeId = Number(round.tee_id);
      const { data: holeRows, error: holeRowsError } = await supabase
        .from("round_holes")
        .select("id, hole_id, score, completed, holes(hole_number, par)")
        .eq("round_id", roundId)
        .order("id", { ascending: true });

      if (requestId !== latestLoadRequestId) return;

      if (isAbortLikeError(holeRowsError)) {
        setLoading(false);
        return;
      }

      if (holeRowsError) {
        setLoadError(holeRowsError.message);
        setLoading(false);
        return;
      }

      const holeIds = (holeRows ?? []).map((row) => row.hole_id);
      const roundHoleIds = (holeRows ?? []).map((row) => Number(row.id));
      const { data: yardageRows, error: yardageError } = await supabase
        .from("hole_tee")
        .select("hole_id, yardage")
        .eq("tee_id", teeId)
        .in("hole_id", holeIds);

      if (requestId !== latestLoadRequestId) return;

      if (isAbortLikeError(yardageError)) {
        setLoading(false);
        return;
      }

      if (yardageError) {
        setLoadError(yardageError.message);
        setLoading(false);
        return;
      }

      const { data: shotRows, error: shotError } = await supabase
        .from("shots")
        .select(
          "round_hole_id, shot_number, distance_to_pin, lie_type, penalty_strokes, recovery, holed_out",
        )
        .in("round_hole_id", roundHoleIds)
        .order("round_hole_id", { ascending: true })
        .order("shot_number", { ascending: true });

      if (requestId !== latestLoadRequestId) return;

      if (isAbortLikeError(shotError)) {
        setLoading(false);
        return;
      }

      if (shotError) {
        setLoadError(shotError.message);
        setLoading(false);
        return;
      }

      const yardageByHoleId = new Map<number, number>();
      for (const row of yardageRows ?? []) {
        yardageByHoleId.set(Number(row.hole_id), Number(row.yardage));
      }

      const holeNumberByRoundHoleId = new Map<number, number>();

      const rows = ((holeRows ?? []) as RoundRow[])
        .map((row) => {
          const hole = getSingleRelation(row.holes);
          if (!hole) return null;

          const scorecardHole = {
            round_hole_id: Number(row.id),
            hole_id: Number(row.hole_id),
            hole_number: Number(hole.hole_number),
            par: Number(hole.par),
            distanceMetres: yardageByHoleId.get(Number(row.hole_id)) ?? 0,
            score: row.score == null ? null : Number(row.score),
            completed: Boolean(row.completed),
          } satisfies ScorecardHole;

          holeNumberByRoundHoleId.set(scorecardHole.round_hole_id, scorecardHole.hole_number);

          return scorecardHole;
        })
        .filter((row): row is ScorecardHole => row !== null)
        .sort((a, b) => a.hole_number - b.hole_number);

      setScorecard(rows);
      const shotsByHoleNumber: Record<number, LocalShot[]> = {};
      for (const shot of shotRows ?? []) {
        const roundHoleId = Number(shot.round_hole_id);
        const holeNumber = holeNumberByRoundHoleId.get(roundHoleId);

        if (holeNumber == null) continue;

        shotsByHoleNumber[holeNumber] ??= [];
        shotsByHoleNumber[holeNumber].push({
          shotNumber: Number(shot.shot_number),
          lieType:
            (typeof shot.lie_type === "string" ? shot.lie_type : "Fairway") as LocalShot["lieType"],
          distanceToPin: Number(shot.distance_to_pin),
          penaltyShots:
            shot.penalty_strokes == null ? 0 : Number(shot.penalty_strokes),
          recovery: Boolean(shot.recovery),
          holedOut: Boolean(shot.holed_out),
        });
      }
      setSavedShotsByHoleNumber(shotsByHoleNumber);
      if (rows.length > 0) {
        const nextHole =
          rows.find((hole) => !hole.completed) ?? rows[rows.length - 1];
        setActiveNine(nextHole.hole_number <= 9 ? "front" : "back");
        setSelectedHoleNumber(nextHole.hole_number);
      }
      setLoading(false);
    } catch (error) {
      if (requestId !== latestLoadRequestId) return;

      if (isAbortLikeError(error)) {
        setLoading(false);
        return;
      }

      setLoadError(
        error instanceof Error ? error.message : t("scoreEntry.errors.loadScorecard"),
      );
      setLoading(false);
    }
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

  const updateRoundFinalisedState = (isFinalised: boolean, partFinalised: boolean) => {
    setRoundHeader((current) => ({
      ...current,
      isFinalised,
      partFinalised,
    }));
  };

  const finaliseRound = async (partFinalised = false): Promise<boolean> => {
    setSaveStage("calculatingSg");
    setSaveStage("finalisingRound");

    const { data: finaliseResult, error: finaliseRoundError } = await supabase
      .rpc("finalise_round_with_sg", {
        p_round_id: roundId,
        p_part_finalised: partFinalised,
      })
      .single<FinaliseRoundResponse>();

    if (finaliseRoundError) {
      throw new Error(finaliseRoundError.message);
    }

    if (!finaliseResult?.round_finalised) {
      throw new Error(t("scoreEntry.errors.notFinalised"));
    }

    updateRoundFinalisedState(true, Boolean(finaliseResult.part_finalised));
    return true;
  };

  const markRoundIncomplete = async () => {
    setEntryError(null);
    setUpdatingRoundStatus(true);

    try {
      const { error } = await supabase
        .from("rounds")
        .update({
          is_finalised: false,
          part_finalised: false,
        })
        .eq("id", roundId);

      if (error) {
        throw new Error(error.message);
      }

      updateRoundFinalisedState(false, false);
    } catch (error) {
      setEntryError(
        error instanceof Error
          ? error.message
          : t("scoreEntry.errors.markIncomplete"),
      );
    } finally {
      setUpdatingRoundStatus(false);
    }
  };

  const completeRoundAfterEdits = async () => {
    setEntryError(null);
    setSavingHole(true);

    try {
      await finaliseRound(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.unknown");
      setEntryError(t("scoreEntry.errors.completeRound", { message }));
    } finally {
      setSavingHole(false);
      setSaveStage(null);
    }
  };

  const persistCompletedHole = async (
    hole: ScorecardHole,
    completedShots: LocalShot[],
  ): Promise<boolean> => {
    setEntryError(null);
    setSavingHole(true);
    setSaveStage("savingHole");

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
        throw new Error(t("scoreEntry.errors.noRoundHoleUpdated"));
      }

      updateScorecardHole(hole.hole_number, {
        score,
        completed: true,
      });
      setSavedShotsByHoleNumber((current) => ({
        ...current,
        [hole.hole_number]: [...completedShots],
      }));

      const allOtherHolesCompleted = scorecard().every(
        (scorecardHole) =>
          scorecardHole.hole_number === hole.hole_number || scorecardHole.completed,
      );
      const shouldAutoFinalise =
        !hole.completed && allOtherHolesCompleted && !roundFinalised();

      if (shouldAutoFinalise) {
        await finaliseRound(false);
      } else {
        moveToNextHole(hole.hole_number);
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.unknown");
      setEntryError(t("scoreEntry.errors.completeHole", { message }));
      return false;
    } finally {
      setSavingHole(false);
      setSaveStage(null);
    }
  };

  onMount(() => {
    void loadScorecard();
  });

  return (
    <div class='mx-auto w-full max-w-5xl space-y-4'>
      <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <div class='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 class='font-rubik text-2xl font-semibold text-slate-800'>
              {t("scoreEntry.title")}
            </h1>
            <p class='mt-1 text-sm text-slate-500'>
              {roundHeader().courseName
                ? `${roundHeader().courseName} - ${roundHeader().teeColor}`
                : t("scoreEntry.roundLabel", {
                    id: Number.isNaN(roundId) ? props.id : roundId,
                  })}
            </p>
          </div>
          <A
            href='/dashboard'
            class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
          >
            {t("scoreEntry.backToDashboard")}
          </A>
        </div>
        <div class='mt-3'>
          <button
            type='button'
            onClick={() => void loadScorecard()}
            class='inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100'
          >
            {t("scoreEntry.refreshScorecard")}
          </button>
        </div>

        <Show
          when={!loading()}
          fallback={
            <div class='mt-4 text-sm text-slate-500'>
              {t("scoreEntry.loadingScorecard")}
            </div>
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
                    ? activeButtonClass
                    : inactiveButtonClass
                }`}
                onClick={() => setNine("front")}
              >
                {t("scoreEntry.frontNine")}
              </button>
              <button
                type='button'
                class={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                  activeNine() === "back"
                    ? activeButtonClass
                    : inactiveButtonClass
                }`}
                onClick={() => setNine("back")}
              >
                {t("scoreEntry.backNine")}
              </button>
            </div>

            <div class='mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-3'>
              {activeNine() === "front" ? (
                <FrontNineTable
                  holes={frontNine()}
                  distanceUnit={distanceUnit()}
                  onSelectHole={setSelectedHoleNumber}
                  selectedHoleNumber={selectedHoleNumber()}
                />
              ) : (
                <BackNineTable
                  holes={backNine()}
                  distanceUnit={distanceUnit()}
                  onSelectHole={setSelectedHoleNumber}
                  selectedHoleNumber={selectedHoleNumber()}
                />
              )}
            </div>
            <p class='mt-3 text-sm text-slate-500'>
              {t("scoreEntry.holeSelectionHint")}
            </p>
          </Show>
        </Show>
      </div>

      <Show when={selectedHole()}>
        {(hole) => (
          <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
            <div class='mb-4 flex flex-wrap items-center justify-between gap-3'>
              <div class='flex w-full items-center justify-between gap-3'>
                <h2 class='font-rubik text-lg font-semibold text-slate-800'>
                  {t("scoreEntry.holeNumber", { number: hole().hole_number })}
                </h2>
                <p class='text-sm text-slate-500'>
                  {t("scoreEntry.parValue", { par: hole().par })} |{" "}
                  {formatMetresForDisplay(
                    hole().distanceMetres,
                    distanceUnit(),
                  )}
                </p>
              </div>
            </div>

            <Show when={roundFinalised()}>
              <div class='mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4'>
                <div class='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <h3 class='font-rubik text-base font-semibold text-emerald-900'>
                      {t("scoreEntry.roundCompleted")}
                    </h3>
                    <p class='mt-1 text-sm text-emerald-800'>
                      {t("scoreEntry.roundCompletedDescription")}
                    </p>
                  </div>
                  <button
                    type='button'
                    class='inline-flex rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60'
                    disabled={updatingRoundStatus()}
                    onClick={() => void markRoundIncomplete()}
                  >
                    {updatingRoundStatus()
                      ? t("common.updating")
                      : t("scoreEntry.markIncomplete")}
                  </button>
                </div>
              </div>
            </Show>
            <Show when={!roundFinalised() && allHolesCompleted()}>
              <div class='mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4'>
                <div class='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <h3 class='font-rubik text-base font-semibold text-cyan-900'>
                      {t("scoreEntry.readyToComplete")}
                    </h3>
                    <p class='mt-1 text-sm text-cyan-800'>
                      {t("scoreEntry.readyToCompleteDescription")}
                    </p>
                  </div>
                  <button
                    type='button'
                    class='inline-flex rounded-md border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-100 disabled:opacity-60'
                    disabled={savingHole()}
                    onClick={() => void completeRoundAfterEdits()}
                  >
                    {savingHole() ? saveStageLabel() : t("rounds.completeRound")}
                  </button>
                </div>
              </div>
            </Show>
            <Show when={savingHole() && selectedHole()?.completed}>
              <div class='mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4'>
                <h3 class='font-rubik text-base font-semibold text-cyan-900'>
                  {t("scoreEntry.finishingRound")}
                </h3>
                <p class='mt-1 text-sm text-cyan-800'>
                  {saveStage() === "calculatingSg"
                    ? t("scoreEntry.finishingCalculating")
                    : saveStage() === "finalisingRound"
                      ? t("scoreEntry.finishingFinalising")
                      : t("scoreEntry.finishingSaving")}
                </p>
              </div>
            </Show>
            <Show
              when={canEditSelectedHole()}
              fallback={
                <p class='rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
                  {t("scoreEntry.markIncompleteToEdit")}
                </p>
              }
            >
              <LocalShotPanel
                distanceUnit={distanceUnit()}
                entryError={entryError()}
                hole={hole()}
                initialShots={savedShotsByHoleNumber()[hole().hole_number] ?? []}
                onCompleteHole={persistCompletedHole}
                savingHole={savingHole()}
                submitLabel={saveStageLabel()}
              />
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
