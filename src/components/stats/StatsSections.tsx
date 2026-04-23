import { useTransContext } from "@mbarzda/solid-i18next";
import { createMemo, Show } from "solid-js";

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
import type { DistanceStatsRow, StatsPageData } from "../../supabase/shotStats";

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

function StatsSection(props: {
  chartTitle: string;
  description: string;
  emptyMessage: string;
  hideChart?: boolean;
  hideDistanceRange?: boolean;
  distanceRangeTranslationPrefix?: string;
  showFairwayColumns?: boolean;
  rows: DistanceStatsRow[];
  t: ReturnType<typeof useTransContext>[0];
}) {
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

  const chartData = createMemo(() => ({
    labels: props.rows.map((row) => displayDistanceRange(row.distance_range)),
    datasets: [
      {
        label: props.t("stats.chart.average"),
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
              {props.t("stats.chart.title")}
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
                  {props.t("stats.table.average")}
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
              {props.rows.map((row) => (
                <tr class='border-b border-slate-100 last:border-b-0'>
                  <Show when={!props.hideDistanceRange}>
                    <td class='px-4 py-3'>
                      {displayDistanceRange(row.distance_range)}
                    </td>
                  </Show>
                  <td class='px-4 py-3'>{row.shots_in_group}</td>
                  <td class='px-4 py-3'>{formatSignedValue(row.avg_sg_value)}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </Show>
    </section>
  );
}

export function StatsSections(props: {
  stats: StatsPageData | undefined;
  t: ReturnType<typeof useTransContext>[0];
}) {
  return (
    <>
      <div class='mt-4'>
        <StatsSection
          chartTitle={props.t("stats.driving.title")}
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
          description={props.t("stats.putting.description")}
          emptyMessage={props.t("stats.putting.empty")}
          rows={props.stats?.putting.rows ?? []}
          distanceRangeTranslationPrefix='stats.putting.ranges'
          t={props.t}
        />
        <StatsSection
          chartTitle={props.t("stats.approach.title")}
          description={props.t("stats.approach.description")}
          emptyMessage={props.t("stats.approach.empty")}
          rows={props.stats?.approach.rows ?? []}
          distanceRangeTranslationPrefix='stats.approach.ranges'
          t={props.t}
        />
        <StatsSection
          chartTitle={props.t("stats.chipping.title")}
          description={props.t("stats.chipping.description")}
          emptyMessage={props.t("stats.chipping.empty")}
          rows={props.stats?.chipping.rows ?? []}
          distanceRangeTranslationPrefix='stats.chipping.ranges'
          t={props.t}
        />
      </div>
    </>
  );
}
