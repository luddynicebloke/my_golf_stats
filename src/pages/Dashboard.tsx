import { createResource } from "solid-js";

import Card from "../components/dashboard/card";

import DashboardChart from "../components/dashboard/dashboardChart";
import LatestRounds from "../components/dashboard/latestRounds";
import { useAuth } from "../context/AuthProvider";
import { supabase } from "../supabase/client";
import type { TLatestRound, TStrokesGained } from "../lib/definitions";

type RoundSummaryRow = {
  id: number;
  round_date: string | null;
  courses:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type RoundHoleSummaryRow = {
  id: number;
  round_id: number;
  score: number | null;
  holes:
    | {
        par: number;
      }
    | {
        par: number;
      }[]
    | null;
};

type ShotSummaryRow = {
  round_hole_id: number;
  shot_number: number;
  distance_to_pin: number;
  lie_type: string;
  sg_value: number | null;
};

type DashboardCardStats = {
  roundCount: number;
  averageScoreToPar: number | null;
  averageScore: number | null;
  averageStrokesGained: number | null;
  latestRounds: TLatestRound[];
  strokesGainedByCategory: TStrokesGained[];
};

type StrokesGainedCategory =
  | "offTheTee"
  | "approach"
  | "longApproach"
  | "mediumApproach"
  | "shortApproach"
  | "chipping"
  | "aroundTheGreen"
  | "putting";

type RoundHoleInfo = {
  roundId: number;
  par: number | null;
};

const METRES_TO_YARDS = 1.09361;

const strokesGainedCategoryLabels: Record<StrokesGainedCategory, string> = {
  offTheTee: "Off the Tee",
  approach: "Approach",
  longApproach: "Long Approach",
  mediumApproach: "Medium Approach",
  shortApproach: "Short Approach",
  chipping: "Chipping",
  aroundTheGreen: "Around the Green",
  putting: "Putting",
};

const getSingleRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const emptyDashboardCardStats = (): DashboardCardStats => ({
  roundCount: 0,
  averageScoreToPar: null,
  averageScore: null,
  averageStrokesGained: null,
  latestRounds: [],
  strokesGainedByCategory: [],
});

const formatAverage = (value: number | null, digits = 2) =>
  value == null ? "-" : value.toFixed(digits);

const formatSignedAverage = (value: number | null, digits = 2) =>
  value == null ? "-" : `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;

const getDistanceInYards = (distanceToPin: number, lieType: string) =>
  lieType.trim().toLowerCase() === "green"
    ? distanceToPin
    : distanceToPin * METRES_TO_YARDS;

const getShotCategory = (
  shot: Pick<ShotSummaryRow, "shot_number" | "distance_to_pin" | "lie_type">,
  par: number | null,
): StrokesGainedCategory => {
  const normalizedLieType = shot.lie_type.trim().toLowerCase();

  if (normalizedLieType === "green") {
    return "putting";
  }

  if (shot.shot_number === 1 && (par === 4 || par === 5)) {
    return "offTheTee";
  }

  const distanceInYards = getDistanceInYards(
    Number(shot.distance_to_pin),
    shot.lie_type,
  );

  if (distanceInYards <= 10) {
    return "aroundTheGreen";
  }

  if (distanceInYards <= 30) {
    return "chipping";
  }

  if (distanceInYards <= 60) {
    return "shortApproach";
  }

  if (distanceInYards <= 90) {
    return "mediumApproach";
  }

  if (distanceInYards <= 120) {
    return "longApproach";
  }

  return "approach";
};

const fetchDashboardCardStats = async (
  userId: string,
): Promise<DashboardCardStats> => {
  if (!userId) {
    return emptyDashboardCardStats();
  }

  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("id, round_date, courses(name)")
    .eq("user_id", userId);

  if (roundsError) {
    console.error("Error fetching dashboard rounds:", roundsError);
    return emptyDashboardCardStats();
  }

  const typedRounds = (rounds ?? []) as RoundSummaryRow[];
  const roundIds = typedRounds.map((round) => Number(round.id));

  if (roundIds.length === 0) {
    return emptyDashboardCardStats();
  }

  const { data: roundHoles, error: roundHolesError } = await supabase
    .from("round_holes")
    .select("id, round_id, score, holes(par)")
    .in("round_id", roundIds);

  if (roundHolesError) {
    console.error("Error fetching dashboard round holes:", roundHolesError);
    return {
      ...emptyDashboardCardStats(),
      roundCount: roundIds.length,
    };
  }

  const scoreTotalsByRoundId = new Map<number, number>();
  const parTotalsByRoundId = new Map<number, number>();
  const roundHoleInfoById = new Map<number, RoundHoleInfo>();
  const roundHoleIds: number[] = [];

  for (const row of (roundHoles ?? []) as RoundHoleSummaryRow[]) {
    const roundId = Number(row.round_id);
    const roundHoleId = Number(row.id);
    const hole = getSingleRelation(row.holes);
    roundHoleInfoById.set(roundHoleId, {
      roundId,
      par: hole?.par == null ? null : Number(hole.par),
    });
    roundHoleIds.push(roundHoleId);

    if (row.score != null) {
      const currentScore = scoreTotalsByRoundId.get(roundId) ?? 0;
      scoreTotalsByRoundId.set(roundId, currentScore + Number(row.score));
    }

    if (hole?.par != null) {
      const currentPar = parTotalsByRoundId.get(roundId) ?? 0;
      parTotalsByRoundId.set(roundId, currentPar + Number(hole.par));
    }
  }

  const sgTotalsByRoundId = new Map<number, number>();
  const latestRoundIds = new Set(
    [...typedRounds]
      .sort((a, b) => (b.round_date ?? "").localeCompare(a.round_date ?? ""))
      .slice(0, 10)
      .map((round) => Number(round.id)),
  );
  const sgTotalsByCategory = new Map<StrokesGainedCategory, number>();

  if (roundHoleIds.length > 0) {
    const { data: shots, error: shotsError } = await supabase
      .from("shots")
      .select("round_hole_id, shot_number, distance_to_pin, lie_type, sg_value")
      .in("round_hole_id", roundHoleIds);

    if (shotsError) {
      console.error("Error fetching dashboard strokes gained:", shotsError);
    } else {
      for (const shot of (shots ?? []) as ShotSummaryRow[]) {
        if (shot.sg_value == null) continue;

        const roundHoleId = Number(shot.round_hole_id);
        const roundHoleInfo = roundHoleInfoById.get(roundHoleId);
        if (!roundHoleInfo) continue;

        const currentTotal = sgTotalsByRoundId.get(roundHoleInfo.roundId) ?? 0;
        sgTotalsByRoundId.set(
          roundHoleInfo.roundId,
          Number((currentTotal + Number(shot.sg_value)).toFixed(3)),
        );

        if (!latestRoundIds.has(roundHoleInfo.roundId)) continue;

        const category = getShotCategory(shot, roundHoleInfo.par);
        const currentCategoryTotal = sgTotalsByCategory.get(category) ?? 0;
        sgTotalsByCategory.set(
          category,
          Number((currentCategoryTotal + Number(shot.sg_value)).toFixed(3)),
        );
      }
    }
  }

  let scoredRoundCount = 0;
  let totalScore = 0;
  let totalScoreToPar = 0;

  for (const roundId of roundIds) {
    const score = scoreTotalsByRoundId.get(roundId);
    const par = parTotalsByRoundId.get(roundId);

    if (score == null || par == null) continue;

    scoredRoundCount += 1;
    totalScore += score;
    totalScoreToPar += score - par;
  }

  const roundsWithSG = roundIds.filter((roundId) =>
    sgTotalsByRoundId.has(roundId),
  );
  const totalStrokesGained = roundsWithSG.reduce(
    (sum, roundId) => sum + (sgTotalsByRoundId.get(roundId) ?? 0),
    0,
  );

  const latestRounds = [...typedRounds]
    .sort((a, b) => (b.round_date ?? "").localeCompare(a.round_date ?? ""))
    .slice(0, 10)
    .map((round) => ({
      date: round.round_date ?? "",
      course: getSingleRelation(round.courses)?.name ?? "Unknown course",
      score: scoreTotalsByRoundId.get(Number(round.id)) ?? null,
      strokesGained: sgTotalsByRoundId.get(Number(round.id)) ?? null,
    }));

  const latestRoundCount = latestRoundIds.size;
  const strokesGainedByCategory = Object.entries(strokesGainedCategoryLabels).map(
    ([category, title]) => ({
      title,
      score:
        latestRoundCount === 0
          ? 0
          : Number(
              (
                (sgTotalsByCategory.get(category as StrokesGainedCategory) ?? 0) /
                latestRoundCount
              ).toFixed(3),
            ),
    }),
  );

  return {
    roundCount: roundIds.length,
    averageScoreToPar:
      scoredRoundCount === 0 ? null : totalScoreToPar / scoredRoundCount,
    averageScore: scoredRoundCount === 0 ? null : totalScore / scoredRoundCount,
    averageStrokesGained:
      roundsWithSG.length === 0
        ? null
        : totalStrokesGained / roundsWithSG.length,
    latestRounds,
    strokesGainedByCategory,
  };
};

export default function Dashboard() {
  const { role, user } = useAuth();
  const [cardStats] = createResource(
    () => user()?.id ?? "",
    fetchDashboardCardStats,
  );

  return (
    <div class='w-full'>
      <div class='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <h1 class='font-rubik text-2xl font-semibold tracking-tight text-gray-600 md:text-3xl'>
          Dashboard
        </h1>
        {role() === "admin" && (
          <a
            href='/admin'
            class='inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100'
          >
            Admin Panel
          </a>
        )}
      </div>

      <div class='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <Card
          title='No. of Rounds'
          value={cardStats()?.roundCount ?? "-"}
          type='rounds'
        />
        <Card
          title='Score to par'
          value={formatSignedAverage(cardStats()?.averageScoreToPar ?? null)}
          type='topar'
        />
        <Card
          title='Average score'
          value={formatAverage(cardStats()?.averageScore ?? null)}
          type='average'
        />
        <Card
          title='Strokes Gained'
          value={formatSignedAverage(
            cardStats()?.averageStrokesGained ?? null,
            3,
          )}
          type='stats'
        />
      </div>

      <div class='mt-6 grid w-full grid-cols-1 gap-6 xl:grid-cols-12'>
        <div class='xl:col-span-7'>
          <DashboardChart currentSG={cardStats()?.strokesGainedByCategory ?? []} />
        </div>
        <div class='xl:col-span-5'>
          <LatestRounds recent={cardStats()?.latestRounds ?? []} />
        </div>
      </div>
    </div>
  );
}
