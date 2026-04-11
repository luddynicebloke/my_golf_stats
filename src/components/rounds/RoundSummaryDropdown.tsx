import { createResource, Show } from "solid-js";

import {
  type RoundSgSummary,
  fetchRoundSgSummary,
} from "../../supabase/roundSummary";
import type { DistanceUnit } from "../../lib/distance";

const formatAverageValue = (value: number | null) => {
  if (value == null) {
    return "-";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(3)}`;
};

const formatCountValue = (value: number) => value.toString();

function SummaryRow(props: {
  label: string;
  value: string;
}) {
  return (
    <div class='flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0 last:pb-0 first:pt-0'>
      <dt class='text-sm text-slate-600'>{props.label}</dt>
      <dd class='text-sm font-semibold text-slate-800'>{props.value}</dd>
    </div>
  );
}

function SummaryContent(props: {
  distanceUnit: DistanceUnit;
  summary: RoundSgSummary;
}) {
  const approachLabel =
    props.distanceUnit === "yards"
      ? "Approach average (>30 yds)"
      : "Approach average (>30m)";
  const shortGameLabel =
    props.distanceUnit === "yards"
      ? "Short game average (<=30 yds)"
      : "Short game average (<=30m)";

  return (
    <dl class='mt-4'>
      <SummaryRow
        label='Off the tee average'
        value={formatAverageValue(props.summary.offTeeAverage)}
      />
      <SummaryRow
        label={approachLabel}
        value={formatAverageValue(props.summary.approachAverage)}
      />
      <SummaryRow
        label={shortGameLabel}
        value={formatAverageValue(props.summary.shortGameAverage)}
      />
      <SummaryRow
        label='Putting average'
        value={formatAverageValue(props.summary.puttingAverage)}
      />
      <SummaryRow
        label='Total SG'
        value={formatAverageValue(props.summary.totalSg)}
      />
      <SummaryRow
        label='Tee shots finishing on fairway'
        value={formatCountValue(props.summary.fairwaysHitFromTee)}
      />
      <SummaryRow
        label='Greens in regulation'
        value={formatCountValue(props.summary.greensInRegulation)}
      />
    </dl>
  );
}

export default function RoundSummaryDropdown(props: {
  distanceUnit: DistanceUnit;
  roundId: number;
}) {
  const [summary] = createResource(
    () => ({
      distanceUnit: props.distanceUnit,
      roundId: props.roundId,
    }),
    async ({ distanceUnit, roundId }) =>
      fetchRoundSgSummary(roundId, distanceUnit),
  );

  return (
    <div class='mt-3 rounded-xl border border-slate-200 bg-white p-4'>
      <div class='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 class='text-base font-semibold text-slate-800'>Round Summary</h3>
          <p class='mt-1 text-sm text-slate-500'>
            Strokes gained averages plus fairway and GIR counts for this round.
          </p>
        </div>
      </div>

      <Show
        when={!summary.loading}
        fallback={
          <p class='mt-4 text-sm text-slate-500'>Loading round summary...</p>
        }
      >
        <Show
          when={!summary.error && summary()}
          fallback={
            <p class='mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
              {summary.error instanceof Error
                ? summary.error.message
                : "Failed to load round summary."}
            </p>
          }
        >
          {(data) => (
            <SummaryContent
              distanceUnit={props.distanceUnit}
              summary={data()}
            />
          )}
        </Show>
      </Show>
    </div>
  );
}
