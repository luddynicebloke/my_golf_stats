import { createMemo, createResource } from "solid-js";
import { A } from "@solidjs/router";

import Card from "../components/dashboard/card";
import DashboardChart from "../components/dashboard/dashboardChart";
import LatestRounds from "../components/dashboard/latestRounds";
import PlayerSelector from "../components/pro/PlayerSelector";
import { useAuth } from "../context/AuthProvider";
import { normalizeDistanceUnit, type DistanceUnit } from "../lib/distance";
import { supabase } from "../supabase/client";
import type { TLatestRound, TStrokesGained } from "../lib/definitions";

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

type DashboardStatsParams = {
  userId: string;
  distanceUnit: DistanceUnit;
};

type DashboardStatsRpcRow = {
  round_count: number | null;
  average_score_to_par: number | null;
  average_score: number | null;
  average_strokes_gained: number | null;
  latest_rounds: unknown;
  strokes_gained_by_category: unknown;
};

type DashboardStatsRpcLatestRound = {
  date: string;
  course: string;
  score: number | null;
  strokesGained: number | null;
};

type DashboardStatsRpcCategory = {
  category: StrokesGainedCategory;
  score: number;
};

const YARDS_TO_METRES = 0.9144;

const strokesGainedCategoryBaseLabels: Record<StrokesGainedCategory, string> = {
  offTheTee: "Off the Tee",
  approach: "Approach",
  longApproach: "Long Approach",
  mediumApproach: "Medium Approach",
  shortApproach: "Short Approach",
  chipping: "Chipping",
  aroundTheGreen: "Around the Green",
  putting: "Putting",
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

const formatWholeNumber = (value: number | null) =>
  value == null ? "-" : Math.round(value).toString();

const formatSignedWholeNumber = (value: number | null) =>
  value == null ? "-" : `${value > 0 ? "+" : ""}${Math.round(value)}`;

const formatRangeValue = (yards: number, unit: DistanceUnit) =>
  unit === "yards" ? yards : Math.round(yards * YARDS_TO_METRES);

const getDistanceRangeLabel = (
  minYards: number | null,
  maxYards: number,
  unit: DistanceUnit,
) => {
  const unitLabel = unit === "yards" ? "yds" : "m";
  const maxLabel = formatRangeValue(maxYards, unit);

  if (minYards == null) {
    return `<=${maxLabel} ${unitLabel}`;
  }

  const minLabel = formatRangeValue(minYards, unit);
  return `${minLabel}-${maxLabel} ${unitLabel}`;
};

const getCategoryLabel = (
  category: StrokesGainedCategory,
  unit: DistanceUnit,
) => {
  switch (category) {
    case "aroundTheGreen":
      return `${strokesGainedCategoryBaseLabels[category]} (${getDistanceRangeLabel(null, 10, unit)})`;
    case "chipping":
      return `${strokesGainedCategoryBaseLabels[category]} (${getDistanceRangeLabel(11, 30, unit)})`;
    case "shortApproach":
      return `${strokesGainedCategoryBaseLabels[category]} (${getDistanceRangeLabel(31, 60, unit)})`;
    case "mediumApproach":
      return `${strokesGainedCategoryBaseLabels[category]} (${getDistanceRangeLabel(61, 90, unit)})`;
    case "longApproach":
      return `${strokesGainedCategoryBaseLabels[category]} (${getDistanceRangeLabel(91, 120, unit)})`;
    default:
      return strokesGainedCategoryBaseLabels[category];
  }
};

const isLatestRoundArray = (
  value: unknown,
): value is DashboardStatsRpcLatestRound[] => Array.isArray(value);

const isCategoryArray = (
  value: unknown,
): value is DashboardStatsRpcCategory[] => Array.isArray(value);

const fetchDashboardCardStats = async ({
  userId,
  distanceUnit,
}: DashboardStatsParams): Promise<DashboardCardStats> => {
  if (!userId) {
    return emptyDashboardCardStats();
  }

  const { data, error } = await supabase
    .rpc("get_dashboard_stats", { p_user_id: userId })
    .single<DashboardStatsRpcRow>();

  if (error || !data) {
    console.error("Error fetching dashboard stats:", error);
    return emptyDashboardCardStats();
  }

  const latestRounds = isLatestRoundArray(data.latest_rounds)
    ? data.latest_rounds.map((round) => ({
        date: round.date ?? "",
        course: round.course ?? "Unknown course",
        score: round.score == null ? null : Number(round.score),
        strokesGained:
          round.strokesGained == null ? null : Number(round.strokesGained),
      }))
    : [];

  const strokesGainedByCategory = isCategoryArray(
    data.strokes_gained_by_category,
  )
    ? data.strokes_gained_by_category.map((item) => ({
        title: getCategoryLabel(item.category, distanceUnit),
        score: Number(item.score ?? 0),
      }))
    : [];

  return {
    roundCount: Number(data.round_count ?? 0),
    averageScoreToPar:
      data.average_score_to_par == null
        ? null
        : Number(data.average_score_to_par),
    averageScore:
      data.average_score == null ? null : Number(data.average_score),
    averageStrokesGained:
      data.average_strokes_gained == null
        ? null
        : Number(data.average_strokes_gained),
    latestRounds,
    strokesGainedByCategory,
  };
};

export default function Dashboard() {
  const auth = useAuth();
  const distanceUnit = createMemo(() =>
    normalizeDistanceUnit(auth.profile()?.preferred_distance_unit),
  );
  const isPro = createMemo(() => auth.role() === "pro");
  const [cardStats] = createResource(
    () => ({
      userId: auth.targetUserId() ?? "",
      distanceUnit: distanceUnit(),
    }),
    fetchDashboardCardStats,
  );

  if (isPro()) {
    return (
      <div class='mx-auto w-full max-w-4xl space-y-6'>
        <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h1 class='font-rubik text-2xl font-semibold tracking-tight text-slate-800 md:text-3xl'>
            Pro Dashboard
          </h1>
          <p class='mt-2 text-sm text-slate-500'>
            Choose a player who has granted you access, then open their rounds
            or statistics in read-only mode.
          </p>
        </div>

        <PlayerSelector
          label='Viewing player'
          players={auth.accessiblePlayers()}
          selectedPlayerId={auth.selectedPlayerId()}
          onChange={auth.setSelectedPlayerId}
        />

        <div class='grid gap-4 sm:grid-cols-2'>
          <A
            href='/dashboard/rounds'
            class='rounded-2xl border border-cyan-200 bg-cyan-50 p-6 text-slate-800 shadow-sm transition hover:bg-cyan-100'
          >
            <h2 class='font-rubik text-xl font-semibold'>Rounds</h2>
            <p class='mt-2 text-sm text-slate-600'>
              Review saved rounds for your selected player.
            </p>
          </A>
          <A
            href='/dashboard/stats'
            class='rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-slate-800 shadow-sm transition hover:bg-emerald-100'
          >
            <h2 class='font-rubik text-xl font-semibold'>Statistics</h2>
            <p class='mt-2 text-sm text-slate-600'>
              View strokes gained summaries and recent trends.
            </p>
          </A>
        </div>
      </div>
    );
  }

  return (
    <div class='w-full'>
      <div class='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <h1 class='font-rubik text-2xl font-semibold tracking-tight text-gray-600 md:text-3xl'>
          Dashboard
        </h1>
        {auth.role() === "admin" && (
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
          title='Avg to par last 10'
          value={formatSignedWholeNumber(
            cardStats()?.averageScoreToPar ?? null,
          )}
          type='topar'
        />
        <Card
          title='Avg score last 10'
          value={formatWholeNumber(cardStats()?.averageScore ?? null)}
          type='average'
        />
        <Card
          title='Avg SG last 10'
          value={formatSignedAverage(
            cardStats()?.averageStrokesGained ?? null,
            3,
          )}
          type='stats'
        />
      </div>

      <div class='mt-6 grid w-full grid-cols-1 gap-6 xl:grid-cols-12'>
        <div class='xl:col-span-7'>
          <DashboardChart
            currentSG={cardStats()?.strokesGainedByCategory ?? []}
          />
        </div>
        <div class='xl:col-span-5'>
          <LatestRounds recent={cardStats()?.latestRounds ?? []} />
        </div>
      </div>
    </div>
  );
}
