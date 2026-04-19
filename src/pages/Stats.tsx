import { useTransContext } from "@mbarzda/solid-i18next";
import { createMemo, createResource, Show } from "solid-js";

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

import PlayerSelector from "../components/pro/PlayerSelector";
import { useAuth } from "../context/AuthProvider";
import { SGColors } from "../lib/graphColors";
import { supabase } from "../supabase/client";

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

type ShotGroup = "putting" | "driving" | "approach" | "chipping";

type DistanceStatsRow = {
  distance_range: string;
  shots_in_group: number;
  avg_sg_value: number | null;
  fairways_hit: number | null;
  fairway_hit_percentage: number | null;
};

type DistanceStatsData = {
  rows: DistanceStatsRow[];
};

type StatsPageData = {
  approach: DistanceStatsData;
  chipping: DistanceStatsData;
  driving: DistanceStatsData;
  putting: DistanceStatsData;
};

const RECENT_ROUNDS_LIMIT = 10;

const emptyDistanceStatsData = (): DistanceStatsData => ({
  rows: [],
});

const emptyStatsPageData = (): StatsPageData => ({
  approach: emptyDistanceStatsData(),
  chipping: emptyDistanceStatsData(),
  driving: emptyDistanceStatsData(),
  putting: emptyDistanceStatsData(),
});

const parseNumberLike = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizeDistanceStatsRow = (value: unknown): DistanceStatsRow | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const distanceRange = row.distance_range;
  const parsedShotsInGroup = parseNumberLike(row.shots_in_group);

  if (typeof distanceRange !== "string" || parsedShotsInGroup == null) {
    return null;
  }

  return {
    distance_range: distanceRange,
    shots_in_group: parsedShotsInGroup,
    avg_sg_value: parseNumberLike(row.avg_sg_value),
    fairways_hit: parseNumberLike(row.fairways_hit),
    fairway_hit_percentage: parseNumberLike(row.fairway_hit_percentage),
  };
};

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

const fetchRecentShotSgStats = async (
  targetUserId: string,
  shotGroup: ShotGroup,
): Promise<DistanceStatsData> => {
  const { data, error } = await supabase.rpc("get_recent_sg_stats_for_user", {
    p_target_user_id: targetUserId,
    p_round_limit: RECENT_ROUNDS_LIMIT,
    p_shot_group: shotGroup,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(data)
    ? data
        .map((item) => normalizeDistanceStatsRow(item))
        .filter((item): item is DistanceStatsRow => item !== null)
    : [];

  return { rows };
};

function StatsSection(props: {
  chartTitle: string;
  description: string;
  emptyMessage: string;
  hideChart?: boolean;
  hideDistanceRange?: boolean;
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

  const chartData = createMemo(() => ({
    labels: props.rows.map((row) => row.distance_range),
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
                    <td class='px-4 py-3'>{row.distance_range}</td>
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

export default function Stats() {
  const [t] = useTransContext();
  const auth = useAuth();
  const isReadOnly = createMemo(() => auth.isReadOnly());

  const [stats] = createResource(
    () => auth.targetUserId() ?? "",
    async (targetUserId) => {
      if (!targetUserId) {
        return emptyStatsPageData();
      }

      const [putting, driving, approach, chipping] = await Promise.all([
        fetchRecentShotSgStats(targetUserId, "putting"),
        fetchRecentShotSgStats(targetUserId, "driving"),
        fetchRecentShotSgStats(targetUserId, "approach"),
        fetchRecentShotSgStats(targetUserId, "chipping"),
      ]);

      return {
        approach,
        chipping,
        driving,
        putting,
      };
    },
  );

  return (
    <div class='mx-auto w-full max-w-6xl space-y-4'>
      <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <div class='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 class='font-rubik text-2xl font-semibold text-slate-800'>
              {t("stats.title")}
            </h1>
            <p class='mt-1 text-sm text-slate-500'>
              {isReadOnly() && auth.selectedPlayer()
                ? `Viewing ${auth.selectedPlayer()?.user_name || auth.selectedPlayer()?.email || "selected player"}`
                : t("stats.subtitle", { count: RECENT_ROUNDS_LIMIT })}
            </p>
          </div>
        </div>

        <Show when={isReadOnly()}>
          <div class='mt-4'>
            <PlayerSelector
              label='Viewing player'
              players={auth.accessiblePlayers()}
              selectedPlayerId={auth.selectedPlayerId()}
              onChange={auth.setSelectedPlayerId}
            />
          </div>
        </Show>

        <Show
          when={!stats.loading && (!isReadOnly() || auth.targetUserId())}
          fallback={
            <p class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>
              {isReadOnly() && !auth.targetUserId()
                ? "Choose a player to view statistics."
                : t("stats.loading")}
            </p>
          }
        >
          <Show
            when={!stats.error}
            fallback={
              <p class='mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>
                {stats.error instanceof Error
                  ? stats.error.message
                  : t("stats.error")}
              </p>
            }
          >
            <div class='mt-4'>
              <StatsSection
                chartTitle={t("stats.driving.title")}
                description={t("stats.driving.description")}
                emptyMessage={t("stats.driving.empty")}
                rows={stats()?.driving.rows ?? []}
                hideChart
                hideDistanceRange
                showFairwayColumns
                t={t}
              />
            </div>

            <div class='mt-4 space-y-4'>
              <StatsSection
                chartTitle={t("stats.putting.title")}
                description={t("stats.putting.description")}
                emptyMessage={t("stats.putting.empty")}
                rows={stats()?.putting.rows ?? []}
                t={t}
              />
              <StatsSection
                chartTitle={t("stats.approach.title")}
                description={t("stats.approach.description")}
                emptyMessage={t("stats.approach.empty")}
                rows={stats()?.approach.rows ?? []}
                t={t}
              />
              <StatsSection
                chartTitle={t("stats.chipping.title")}
                description={t("stats.chipping.description")}
                emptyMessage={t("stats.chipping.empty")}
                rows={stats()?.chipping.rows ?? []}
                t={t}
              />
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
