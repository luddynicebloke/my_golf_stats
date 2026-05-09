import { useTransContext } from "@mbarzda/solid-i18next";
import { createMemo, createSignal, For, Show } from "solid-js";

import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Colors,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "solid-chartjs";

import { SGColors } from "../../lib/graphColors";
import {
  convertMetresToUnit,
  type DistanceUnit,
} from "../../lib/distance";
import type {
  DistanceStatsRow,
  ShotGroup,
  ShotDetail,
  StatsPageData,
} from "../../supabase/shotStats";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Colors,
);

const formatSignedValue = (value: number | null) => {
  if (value == null) {
    return "-";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(3)}`;
};

const formatTableValue = (value: number | null) => {
  if (value == null) {
    return "-";
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(3);
};

const formatPercentageValue = (value: number | null) =>
  value == null ? "-" : `${value.toFixed(1)}%`;

const FEET_TO_METRES = 0.3048;

const formatGreenDistance = (distanceInFeet: number, unit: DistanceUnit) => {
  if (unit === "yards") {
    return `${Math.round(distanceInFeet)} ft`;
  }

  const metres = Math.round(distanceInFeet * FEET_TO_METRES * 2) / 2;
  const displayValue = Number.isInteger(metres)
    ? metres.toFixed(0)
    : metres.toFixed(1);

  return `${displayValue} m`;
};

const formatTeeToGreenDistance = (
  distanceInMetres: number,
  unit: DistanceUnit,
) => {
  const unitLabel = unit === "yards" ? "yds" : "m";

  return `${convertMetresToUnit(distanceInMetres, unit)} ${unitLabel}`;
};

const formatShotDistance = (shot: ShotDetail, unit: DistanceUnit) =>
  shot.lieType.trim().toLowerCase() === "green"
    ? formatGreenDistance(shot.distanceToPin, unit)
    : formatTeeToGreenDistance(shot.distanceToPin, unit);

type ImprovementPriority = {
  category: ShotGroup;
  distanceRange: string;
  shotDetails: ShotDetail[];
  shots: number;
  strokesLost: number;
};

type WeaknessRange = {
  distanceRange: string;
  shots: number;
  strokesLost: number;
};

type WeaknessRankingRow = {
  category: ShotGroup;
  ranges: WeaknessRange[];
  shots: number;
  strokesLost: number;
};

const improvementCategories: {
  category: ShotGroup;
  translationKey: string;
  distanceRangeTranslationPrefix?: string;
}[] = [
  {
    category: "approach",
    translationKey: "stats.approach.title",
    distanceRangeTranslationPrefix: "stats.approach.ranges",
  },
  {
    category: "chipping",
    translationKey: "stats.chipping.title",
    distanceRangeTranslationPrefix: "stats.chipping.ranges",
  },
  {
    category: "putting",
    translationKey: "stats.putting.title",
    distanceRangeTranslationPrefix: "stats.putting.ranges",
  },
  {
    category: "driving",
    translationKey: "stats.driving.title",
  },
];

const distanceRangeTranslationKeys: Record<string, string> = {
  "1 to 10": "1_10",
  "0 to 3": "0_3",
  "4 to 7": "4_7",
  "8 to 11": "8_11",
  "12 to 15": "12_15",
  "16 to 20": "16_20",
  "11 to 20": "11_20",
  "21 to 30": "21_30",
  "31 to 40": "31_40",
  "31 to 60": "31_60",
  "41 to 50": "41_50",
  "51 to 60": "51_60",
  "61 to 74": "61_74",
  "61 to 90": "61_90",
  "75 to 119": "75_119",
  "91 to 120": "91_120",
  "120+": "120_plus",
  "121 to 150": "121_150",
  "151 to 200": "151_200",
  "31+": "31_plus",
  "201+": "201_plus",
};

const formatDistanceRange = (
  distanceRange: string,
  translationPrefix: string | undefined,
  t: ReturnType<typeof useTransContext>[0],
) => {
  if (!translationPrefix) {
    return distanceRange;
  }

  const translationKey = distanceRangeTranslationKeys[distanceRange];
  if (!translationKey) {
    return distanceRange;
  }

  return t(`${translationPrefix}.${translationKey}`, {
    defaultValue: distanceRange,
  });
};

const getRowStrokesLost = (row: DistanceStatsRow, category: ShotGroup) => {
  if (row.avg_sg_value == null || row.avg_sg_value >= 0) {
    return 0;
  }

  const strokesGained =
    category === "driving"
      ? row.avg_sg_value * row.shots_in_group
      : row.avg_sg_value;

  return Math.abs(strokesGained);
};

const getImprovementPriorities = (
  stats: StatsPageData | undefined,
): ImprovementPriority[] => {
  if (!stats) {
    return [];
  }

  return improvementCategories
    .flatMap(({ category }) =>
      stats[category].rows.map((row) => ({
        category,
        distanceRange: row.distance_range,
        shotDetails: row.shot_details ?? [],
        shots: row.shots_in_group,
        strokesLost: getRowStrokesLost(row, category),
      })),
    )
    .filter((priority) => priority.strokesLost > 0)
    .sort((a, b) => b.strokesLost - a.strokesLost)
    .slice(0, 3);
};

const getWeaknessRanking = (
  stats: StatsPageData | undefined,
): WeaknessRankingRow[] => {
  if (!stats) {
    return [];
  }

  return improvementCategories
    .map(({ category }) => {
      const ranges = stats[category].rows
        .map((row) => ({
          distanceRange: row.distance_range,
          shots: row.shots_in_group,
          strokesLost: getRowStrokesLost(row, category),
        }))
        .filter((range) => range.strokesLost > 0)
        .sort((a, b) => b.strokesLost - a.strokesLost);

      return {
        category,
        ranges,
        shots: ranges.reduce((total, range) => total + range.shots, 0),
        strokesLost: ranges.reduce(
          (total, range) => total + range.strokesLost,
          0,
        ),
      };
    })
    .filter((row) => row.strokesLost > 0)
    .sort((a, b) => b.strokesLost - a.strokesLost);
};

const getCategoryConfig = (category: ShotGroup) =>
  improvementCategories.find((config) => config.category === category);

const getCategoryLabel = (
  category: ShotGroup,
  t: ReturnType<typeof useTransContext>[0],
) => {
  const config = getCategoryConfig(category);

  return config ? t(config.translationKey) : category;
};

const getRangeLabel = (
  category: ShotGroup,
  distanceRange: string,
  t: ReturnType<typeof useTransContext>[0],
) => {
  const config = getCategoryConfig(category);

  return formatDistanceRange(
    distanceRange,
    config?.distanceRangeTranslationPrefix,
    t,
  );
};

function ImprovementPriorities(props: {
  distanceUnit: DistanceUnit;
  stats: StatsPageData | undefined;
  t: ReturnType<typeof useTransContext>[0];
}) {
  const [expandedPriority, setExpandedPriority] = createSignal<string | null>(
    null,
  );
  const priorities = createMemo(() => getImprovementPriorities(props.stats));

  const getPriorityId = (priority: ImprovementPriority) =>
    `${priority.category}:${priority.distanceRange}`;

  const isExpanded = (priority: ImprovementPriority) =>
    expandedPriority() === getPriorityId(priority);

  const togglePriority = (priority: ImprovementPriority) => {
    if (priority.shotDetails.length === 0) {
      return;
    }

    const priorityId = getPriorityId(priority);
    setExpandedPriority(isExpanded(priority) ? null : priorityId);
  };

  const getDistanceLabel = (priority: ImprovementPriority) => {
    return getRangeLabel(
      priority.category,
      priority.distanceRange,
      props.t,
    );
  };

  const getPriorityTitle = (priority: ImprovementPriority) => {
    const category = getCategoryLabel(priority.category, props.t);

    if (priority.category === "driving") {
      return props.t("stats.improvement.drivingCardTitle", { category });
    }

    return props.t("stats.improvement.cardTitle", {
      category,
      range: getDistanceLabel(priority),
    });
  };

  return (
    <section class='mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm sm:p-6'>
      <div class='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            {props.t("stats.improvement.title")}
          </h2>
          <p class='mt-1 text-sm text-slate-600'>
            {props.t("stats.improvement.description")}
          </p>
        </div>
      </div>

      <Show
        when={priorities().length > 0}
        fallback={
          <p class='mt-4 rounded-xl border border-cyan-200 bg-white p-4 text-sm text-slate-600'>
            {props.t("stats.improvement.empty")}
          </p>
        }
      >
        <div class='mt-4 grid gap-3 lg:grid-cols-3'>
          <For each={priorities()}>
            {(priority, index) => (
              <article class='rounded-xl border border-cyan-200 bg-white p-4 text-slate-800 shadow-sm'>
                <button
                  type='button'
                  aria-expanded={isExpanded(priority)}
                  class='w-full text-left'
                  onClick={() => togglePriority(priority)}
                >
                  <div class='flex items-center gap-3'>
                    <span class='flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-900 font-rubik text-base font-semibold text-white shadow-sm'>
                      {index() + 1}
                    </span>
                    <div>
                      <h3 class='font-rubik text-base font-semibold text-slate-900'>
                        {getPriorityTitle(priority)}
                      </h3>
                      <p class='mt-1 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800'>
                        {props.t("stats.improvement.shots", {
                          count: priority.shots,
                        })}
                      </p>
                    </div>
                  </div>
                </button>

                <div class='mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700'>
                  {props.t("stats.improvement.lostStrokes", {
                    strokes: priority.strokesLost.toFixed(1),
                  })}
                </div>
                <p class='mt-3 text-sm font-semibold text-slate-700'>
                  {props.t("stats.improvement.biggestLeak")}
                </p>
                <p class='mt-1 text-sm text-slate-600'>
                  {props.t(`stats.improvement.practice.${priority.category}`)}
                </p>
                <button
                  type='button'
                  aria-expanded={isExpanded(priority)}
                  class='mt-4 inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100'
                  onClick={() => togglePriority(priority)}
                >
                  {isExpanded(priority)
                    ? props.t("stats.improvement.hideEvidence")
                    : props.t("stats.improvement.showEvidence")}
                </button>

                <Show when={isExpanded(priority)}>
                  <div class='mt-4'>
                    <PriorityShotEvidence
                      distanceUnit={props.distanceUnit}
                      shotDetails={priority.shotDetails}
                      t={props.t}
                    />
                  </div>
                </Show>
              </article>
            )}
          </For>
        </div>
      </Show>
    </section>
  );
}

function WeaknessRanking(props: {
  stats: StatsPageData | undefined;
  t: ReturnType<typeof useTransContext>[0];
}) {
  const ranking = createMemo(() => getWeaknessRanking(props.stats));

  return (
    <section class='mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
      <div>
        <h2 class='font-rubik text-xl font-semibold text-slate-800'>
          {props.t("stats.weaknessRanking.title")}
        </h2>
        <p class='mt-1 text-sm text-slate-500'>
          {props.t("stats.weaknessRanking.description")}
        </p>
      </div>

      <Show
        when={ranking().length > 0}
        fallback={
          <p class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>
            {props.t("stats.weaknessRanking.empty")}
          </p>
        }
      >
        <div class='mt-4 overflow-x-auto rounded-xl border border-slate-200'>
          <table class='w-full min-w-160 text-left text-sm text-slate-700'>
            <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
              <tr>
                <th class='px-4 py-3 font-semibold'>
                  {props.t("stats.weaknessRanking.table.rank")}
                </th>
                <th class='px-4 py-3 font-semibold'>
                  {props.t("stats.weaknessRanking.table.area")}
                </th>
                <th class='px-4 py-3 font-semibold'>
                  {props.t("stats.weaknessRanking.table.totalLost")}
                </th>
                <th class='px-4 py-3 font-semibold'>
                  {props.t("stats.weaknessRanking.table.shots")}
                </th>
                <th class='px-4 py-3 font-semibold'>
                  {props.t("stats.weaknessRanking.table.ranges")}
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={ranking()}>
                {(row, index) => (
                  <tr class='border-b border-slate-100 last:border-b-0'>
                    <td class='px-4 py-3 font-semibold text-slate-800'>
                      {index() + 1}
                    </td>
                    <td class='px-4 py-3 font-semibold text-slate-800'>
                      {getCategoryLabel(row.category, props.t)}
                    </td>
                    <td class='px-4 py-3 text-rose-700'>
                      {props.t("stats.weaknessRanking.lostStrokes", {
                        strokes: row.strokesLost.toFixed(1),
                      })}
                    </td>
                    <td class='px-4 py-3'>{row.shots}</td>
                    <td class='px-4 py-3'>
                      <div class='flex flex-wrap gap-2'>
                        <For each={row.ranges.slice(0, 3)}>
                          {(range) => (
                            <span class='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700'>
                              {props.t(
                                "stats.weaknessRanking.rangeSummary",
                                {
                                  range:
                                    row.category === "driving"
                                      ? getCategoryLabel(row.category, props.t)
                                      : getRangeLabel(
                                          row.category,
                                          range.distanceRange,
                                          props.t,
                                        ),
                                  strokes: range.strokesLost.toFixed(1),
                                },
                              )}
                            </span>
                          )}
                        </For>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </section>
  );
}

function StatsSection(props: {
  chartTitle: string;
  chartValueTitle?: string;
  description: string;
  distanceUnit: DistanceUnit;
  emptyMessage: string;
  sgValueLabel?: string;
  hideChart?: boolean;
  hideDistanceRange?: boolean;
  distanceRangeTranslationPrefix?: string;
  showFairwayColumns?: boolean;
  rows: DistanceStatsRow[];
  t: ReturnType<typeof useTransContext>[0];
}) {
  const [expandedDistanceRange, setExpandedDistanceRange] = createSignal<
    string | null
  >(null);

  const fairwaySummary = createMemo(() => {
    const fairwayRows = props.rows.filter((row) => row.fairways_hit != null);

    if (fairwayRows.length === 0) {
      return null;
    }

    const fairwaysHit = fairwayRows.reduce(
      (total, row) => total + (row.fairways_hit ?? 0),
      0,
    );
    const opportunities = fairwayRows.reduce(
      (total, row) => total + row.shots_in_group,
      0,
    );

    return {
      fairwaysHit,
      opportunities,
      percentage:
        opportunities === 0 ? null : (fairwaysHit / opportunities) * 100,
    };
  });

  const displayDistanceRange = (distanceRange: string) =>
    formatDistanceRange(
      distanceRange,
      props.distanceRangeTranslationPrefix,
      props.t,
    );

  const hasShotDetails = (row: DistanceStatsRow) =>
    (row.shot_details?.length ?? 0) > 0;

  const isExpanded = (row: DistanceStatsRow) =>
    expandedDistanceRange() === row.distance_range;

  const toggleShotDetails = (row: DistanceStatsRow) => {
    if (!hasShotDetails(row)) {
      return;
    }

    setExpandedDistanceRange(isExpanded(row) ? null : row.distance_range);
  };

  const detailColumnSpan = () =>
    (props.hideDistanceRange ? 0 : 1) + (props.showFairwayColumns ? 4 : 2);

  const chartData = createMemo(() => ({
    labels: props.rows.map((row) => displayDistanceRange(row.distance_range)),
    datasets: [
      {
        label: props.sgValueLabel ?? props.t("stats.chart.average"),
        data: props.rows.map((row) => row.avg_sg_value ?? 0),
        backgroundColor: props.rows.map(
          (_, index) => SGColors[index % SGColors.length],
        ),
      },
    ],
  }));

  const chartOptions = createMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          color: "gray",
          font: { size: 12 },
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: "gray",
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
  }));

  return (
    <section class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
      <div class='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            {props.chartTitle}
          </h2>
          <p class='mt-1 text-sm text-slate-500'>{props.description}</p>
        </div>
        <Show when={fairwaySummary()}>
          {(summary) => (
            <div class='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
              {props.t("stats.driving.fairwaysHit")}: {summary().fairwaysHit}/
              {summary().opportunities}
              {" | "}
              {props.t("stats.driving.fairwaysHitRate")}:{" "}
              {formatPercentageValue(summary().percentage)}
            </div>
          )}
        </Show>
      </div>

      <Show
        when={props.rows.length > 0}
        fallback={
          <p class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>
            {props.emptyMessage}
          </p>
        }
      >
        <Show when={!props.hideChart}>
          <div class='mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
            <h3 class='mb-4 font-rubik text-lg font-semibold text-slate-800 sm:text-xl'>
              {props.chartValueTitle ?? props.t("stats.chart.title")}
            </h3>
            <div class='h-72 sm:h-80'>
              <Bar data={chartData()} options={chartOptions()} />
            </div>
          </div>
        </Show>

        <div class='mt-4 overflow-x-auto rounded-xl border border-slate-200'>
          <table class='w-full min-w-120 text-left text-sm text-slate-700'>
            <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
              <tr>
                <Show when={!props.hideDistanceRange}>
                  <th class='px-4 py-3 font-semibold'>
                    {props.t("stats.table.distanceRange")}
                  </th>
                </Show>
                <th class='px-4 py-3 font-semibold'>
                  {props.t("stats.table.shots")}
                </th>
                <th class='px-4 py-3 font-semibold'>
                  {props.sgValueLabel ?? props.t("stats.table.average")}
                </th>
                <Show when={props.showFairwayColumns}>
                  <>
                    <th class='px-4 py-3 font-semibold'>
                      {props.t("stats.table.fairwaysHit")}
                    </th>
                    <th class='px-4 py-3 font-semibold'>
                      {props.t("stats.table.fairwayHitRate")}
                    </th>
                  </>
                </Show>
              </tr>
            </thead>
            <tbody>
              <For each={props.rows}>
                {(row) => (
                  <>
                    <tr class='border-b border-slate-100 last:border-b-0'>
                      <Show when={!props.hideDistanceRange}>
                        <td class='px-4 py-3'>
                          {displayDistanceRange(row.distance_range)}
                        </td>
                      </Show>
                      <td class='px-4 py-3'>
                        <Show
                          when={hasShotDetails(row)}
                          fallback={row.shots_in_group}
                        >
                          <button
                            type='button'
                            aria-expanded={isExpanded(row)}
                            class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 font-semibold text-cyan-800 hover:bg-cyan-100'
                            onClick={() => toggleShotDetails(row)}
                          >
                            {row.shots_in_group}
                          </button>
                        </Show>
                      </td>
                      <td class='px-4 py-3'>
                        {formatSignedValue(row.avg_sg_value)}
                      </td>
                      <Show when={props.showFairwayColumns}>
                        <>
                          <td class='px-4 py-3'>
                            {formatTableValue(row.fairways_hit)}
                          </td>
                          <td class='px-4 py-3'>
                            {formatPercentageValue(row.fairway_hit_percentage)}
                          </td>
                        </>
                      </Show>
                    </tr>
                    <Show when={isExpanded(row) && row.shot_details}>
                      {(shotDetails) => (
                        <tr class='border-b border-slate-100 bg-slate-50'>
                          <td
                            colSpan={detailColumnSpan()}
                            class='px-4 py-3'
                          >
                            <ShotEvidenceTable
                              distanceUnit={props.distanceUnit}
                              shotDetails={shotDetails()}
                              t={props.t}
                            />
                          </td>
                        </tr>
                      )}
                    </Show>
                  </>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </section>
  );
}

function ShotEvidenceTable(props: {
  distanceUnit: DistanceUnit;
  shotDetails: ShotDetail[];
  t: ReturnType<typeof useTransContext>[0];
}) {
  return (
    <div class='overflow-x-auto rounded-lg border border-slate-200 bg-white'>
      <table class='w-full min-w-120 text-left text-xs text-slate-700 sm:text-sm'>
        <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
          <tr>
            <th class='px-3 py-2 font-semibold'>
              {props.t("stats.driving.details.course")}
            </th>
            <th class='px-3 py-2 font-semibold'>
              {props.t("stats.driving.details.date")}
            </th>
            <th class='px-3 py-2 font-semibold'>
              {props.t("stats.driving.details.hole")}
            </th>
            <th class='px-3 py-2 font-semibold'>
              {props.t("stats.driving.details.distance")}
            </th>
            <th class='px-3 py-2 font-semibold'>
              {props.t("stats.driving.details.lie")}
            </th>
            <th class='px-3 py-2 font-semibold'>
              {props.t("stats.driving.details.sg")}
            </th>
          </tr>
        </thead>
        <tbody>
          <For each={props.shotDetails}>
            {(shot) => (
              <tr class='border-b border-slate-100 last:border-b-0'>
                <td class='px-3 py-2'>{shot.courseName}</td>
                <td class='px-3 py-2'>{shot.roundDate}</td>
                <td class='px-3 py-2'>{shot.holeNumber}</td>
                <td class='px-3 py-2'>
                  {formatShotDistance(shot, props.distanceUnit)}
                </td>
                <td class='px-3 py-2'>
                  {props.t(`lieTypes.${shot.lieType}`, {
                    defaultValue: shot.lieType,
                  })}
                </td>
                <td class='px-3 py-2'>{formatSignedValue(shot.sgValue)}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

function PriorityShotEvidence(props: {
  distanceUnit: DistanceUnit;
  shotDetails: ShotDetail[];
  t: ReturnType<typeof useTransContext>[0];
}) {
  return (
    <div class='space-y-2'>
      <For each={props.shotDetails}>
        {(shot) => (
          <div class='rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700'>
            <div class='flex items-start justify-between gap-3'>
              <div class='min-w-0'>
                <p class='truncate font-semibold text-slate-900'>
                  {shot.courseName}
                </p>
                <p class='mt-1 text-slate-500'>{shot.roundDate}</p>
              </div>
              <span class='shrink-0 rounded-full bg-white px-2 py-1 font-semibold text-slate-800'>
                {formatSignedValue(shot.sgValue)}
              </span>
            </div>
            <div class='mt-2 grid grid-cols-3 gap-2'>
              <div>
                <p class='font-semibold text-slate-500'>
                  {props.t("stats.driving.details.hole")}
                </p>
                <p class='mt-0.5 text-slate-800'>{shot.holeNumber}</p>
              </div>
              <div>
                <p class='font-semibold text-slate-500'>
                  {props.t("stats.driving.details.distance")}
                </p>
                <p class='mt-0.5 text-slate-800'>
                  {formatShotDistance(shot, props.distanceUnit)}
                </p>
              </div>
              <div>
                <p class='font-semibold text-slate-500'>
                  {props.t("stats.driving.details.lie")}
                </p>
                <p class='mt-0.5 truncate text-slate-800'>
                  {props.t(`lieTypes.${shot.lieType}`, {
                    defaultValue: shot.lieType,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

export function StatsSections(props: {
  distanceUnit: DistanceUnit;
  stats: StatsPageData | undefined;
  t: ReturnType<typeof useTransContext>[0];
}) {
  return (
    <>
      <ImprovementPriorities
        distanceUnit={props.distanceUnit}
        stats={props.stats}
        t={props.t}
      />
      <WeaknessRanking stats={props.stats} t={props.t} />

      <div class='mt-4'>
        <StatsSection
          chartTitle={props.t("stats.driving.title")}
          distanceUnit={props.distanceUnit}
          description={props.t("stats.driving.description")}
          emptyMessage={props.t("stats.driving.empty")}
          rows={props.stats?.driving.rows ?? []}
          hideChart
          hideDistanceRange
          showFairwayColumns
          t={props.t}
        />
      </div>

      <div class='mt-4 space-y-4'>
        <StatsSection
          chartTitle={props.t("stats.putting.title")}
          chartValueTitle={props.t("stats.chart.totalTitle")}
          distanceUnit={props.distanceUnit}
          description={props.t("stats.putting.description")}
          emptyMessage={props.t("stats.putting.empty")}
          rows={props.stats?.putting.rows ?? []}
          distanceRangeTranslationPrefix='stats.putting.ranges'
          sgValueLabel={props.t("stats.table.total")}
          t={props.t}
        />
        <StatsSection
          chartTitle={props.t("stats.approach.title")}
          chartValueTitle={props.t("stats.chart.totalTitle")}
          distanceUnit={props.distanceUnit}
          description={props.t("stats.approach.description")}
          emptyMessage={props.t("stats.approach.empty")}
          rows={props.stats?.approach.rows ?? []}
          distanceRangeTranslationPrefix='stats.approach.ranges'
          sgValueLabel={props.t("stats.table.total")}
          t={props.t}
        />
        <StatsSection
          chartTitle={props.t("stats.chipping.title")}
          chartValueTitle={props.t("stats.chart.totalTitle")}
          distanceUnit={props.distanceUnit}
          description={props.t("stats.chipping.description")}
          emptyMessage={props.t("stats.chipping.empty")}
          rows={props.stats?.chipping.rows ?? []}
          distanceRangeTranslationPrefix='stats.chipping.ranges'
          sgValueLabel={props.t("stats.table.total")}
          t={props.t}
        />
      </div>
    </>
  );
}
