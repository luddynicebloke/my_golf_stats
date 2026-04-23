import { createMemo, createResource } from "solid-js";
import { A } from "@solidjs/router";
import { useTransContext } from "@mbarzda/solid-i18next";

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
  strokesGainedByCategory: DashboardSgCategoryStat[];
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

type DashboardSgCategoryStat = {
  category: StrokesGainedCategory;
  score: number;
};

const YARDS_TO_METRES = 0.9144;

const strokesGainedCategoryTranslationKeys: Record<
  StrokesGainedCategory,
  string
> = {
  offTheTee: "tee",
  approach: "approach",
  longApproach: "longApproach",
  mediumApproach: "mediumApproach",
  shortApproach: "shortApproach",
  chipping: "chipping",
  aroundTheGreen: "arroundTheGreen",
  putting: "putting",
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
  t: ReturnType<typeof useTransContext>[0],
) => {
  const baseLabel = t(
    `dashboard.chart.SG.${strokesGainedCategoryTranslationKeys[category]}`,
  );

  switch (category) {
    case "aroundTheGreen":
      return `${baseLabel} (${getDistanceRangeLabel(null, 10, unit)})`;
    case "chipping":
      return `${baseLabel} (${getDistanceRangeLabel(11, 30, unit)})`;
    case "shortApproach":
      return `${baseLabel} (${getDistanceRangeLabel(31, 60, unit)})`;
    case "mediumApproach":
      return `${baseLabel} (${getDistanceRangeLabel(61, 90, unit)})`;
    case "longApproach":
      return `${baseLabel} (${getDistanceRangeLabel(91, 120, unit)})`;
    default:
      return baseLabel;
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
        category: item.category,
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
  const [t] = useTransContext();
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
  const chartStrokesGained = createMemo<TStrokesGained[]>(() =>
    (cardStats()?.strokesGainedByCategory ?? []).map((item) => ({
      title: getCategoryLabel(item.category, distanceUnit(), t),
      score: item.score,
    })),
  );

  if (isPro()) {
    return (
      <div class='mx-auto w-full max-w-4xl space-y-6'>
        <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h1 class='font-rubik text-2xl font-semibold tracking-tight text-slate-800 md:text-3xl'>
            {t("dashboard.pro.title")}
          </h1>
          <p class='mt-2 text-sm text-slate-500'>
            {t("dashboard.pro.description")}
          </p>
        </div>

        <PlayerSelector
          label={t("stats.viewingPlayerLabel")}
          players={auth.accessiblePlayers()}
          selectedPlayerId={auth.selectedPlayerId()}
          onChange={auth.setSelectedPlayerId}
        />

        <div class='grid gap-4 sm:grid-cols-2'>
          <A
            href='/dashboard/rounds'
            class='rounded-2xl border border-cyan-200 bg-cyan-50 p-6 text-slate-800 shadow-sm transition hover:bg-cyan-100'
          >
            <h2 class='font-rubik text-xl font-semibold'>
              {t("common.rounds")}
            </h2>
            <p class='mt-2 text-sm text-slate-600'>
              {t("dashboard.pro.roundsDescription")}
            </p>
          </A>
          <A
            href='/dashboard/stats'
            class='rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-slate-800 shadow-sm transition hover:bg-emerald-100'
          >
            <h2 class='font-rubik text-xl font-semibold'>
              {t("common.statistics")}
            </h2>
            <p class='mt-2 text-sm text-slate-600'>
              {t("dashboard.pro.statsDescription")}
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
          {t("dashboard.title")}
        </h1>
        {auth.role() === "admin" && (
          <a
            href='/admin'
            class='inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100'
          >
            {t("admin.title")}
          </a>
        )}
      </div>

      <div class='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <Card
          title={t("dashboard.cards.roundCount")}
          value={cardStats()?.roundCount ?? "-"}
          type='rounds'
        />
        <Card
          title={t("dashboard.cards.averageScoreToParLast10")}
          value={formatSignedWholeNumber(
            cardStats()?.averageScoreToPar ?? null,
          )}
          type='topar'
        />
        <Card
          title={t("dashboard.cards.averageScoreLast10")}
          value={formatWholeNumber(cardStats()?.averageScore ?? null)}
          type='average'
        />
        <Card
          title={t("dashboard.cards.averageSgLast10")}
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
            currentSG={chartStrokesGained()}
          />
        </div>
        <div class='xl:col-span-5'>
          <LatestRounds recent={cardStats()?.latestRounds ?? []} />
        </div>
      </div>
    </div>
  );
}
