import { createResource, createSignal, Show } from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";

import {
  type RoundSgSummary,
  fetchRoundSgSummary,
  rerunRoundStrokesGained,
} from "../../supabase/roundSummary";
import type { DistanceUnit } from "../../lib/distance";

const formatSgValue = (value: number | null) => {
  if (value == null) {
    return "-";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(3)}`;
};

const formatCountValue = (value: number) => value.toString();

const formatGreenDistanceValue = (
  feet: number,
  distanceUnit: DistanceUnit,
) => {
  if (distanceUnit === "metres") {
    return `${(feet * 0.3048).toFixed(1)} m`;
  }

  return `${Math.round(feet)} ft`;
};

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
  const [t] = useTransContext();
  const approachLabel =
    props.distanceUnit === "yards"
      ? t("roundSummary.approachTotalYards")
      : t("roundSummary.approachTotalMetres");
  const shortGameLabel =
    props.distanceUnit === "yards"
      ? t("roundSummary.shortGameTotalYards")
      : t("roundSummary.shortGameTotalMetres");

  return (
    <dl class='mt-4'>
      <SummaryRow
        label={t("roundSummary.offTeeTotal")}
        value={formatSgValue(props.summary.offTeeTotal)}
      />
      <SummaryRow
        label={approachLabel}
        value={formatSgValue(props.summary.approachTotal)}
      />
      <SummaryRow
        label={shortGameLabel}
        value={formatSgValue(props.summary.shortGameTotal)}
      />
      <SummaryRow
        label={t("roundSummary.puttingTotal")}
        value={formatSgValue(props.summary.puttingTotal)}
      />
      <SummaryRow
        label={t("roundSummary.totalSg")}
        value={formatSgValue(props.summary.totalSg)}
      />
      <SummaryRow
        label={t("roundSummary.fairwaysHitFromTee")}
        value={formatCountValue(props.summary.fairwaysHitFromTee)}
      />
      <SummaryRow
        label={t("roundSummary.greensInRegulation")}
        value={formatCountValue(props.summary.greensInRegulation)}
      />
      <SummaryRow
        label={t("roundSummary.putts")}
        value={formatCountValue(props.summary.putts)}
      />
      <SummaryRow
        label={t("roundSummary.greenHoledOutDistance")}
        value={formatGreenDistanceValue(
          props.summary.greenHoledOutDistanceFeet,
          props.distanceUnit,
        )}
      />
    </dl>
  );
}

export default function RoundSummaryDropdown(props: {
  distanceUnit: DistanceUnit;
  onRerunComplete?: () => Promise<unknown> | unknown;
  partFinalised: boolean;
  roundId: number;
}) {
  const [t] = useTransContext();
  const [rerunningSg, setRerunningSg] = createSignal(false);
  const [rerunError, setRerunError] = createSignal<string | null>(null);
  const [summary, { refetch }] = createResource(
    () => ({
      distanceUnit: props.distanceUnit,
      roundId: props.roundId,
    }),
    async ({ distanceUnit, roundId }) =>
      fetchRoundSgSummary(roundId, distanceUnit),
  );

  const handleRerunSg = async () => {
    if (rerunningSg()) {
      return;
    }

    setRerunError(null);
    setRerunningSg(true);

    try {
      await rerunRoundStrokesGained(props.roundId, props.partFinalised);
      await refetch();
      await props.onRerunComplete?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("errors.unknown");
      setRerunError(t("roundSummary.rerunError", { message }));
    } finally {
      setRerunningSg(false);
    }
  };

  return (
    <div class='mt-3 rounded-xl border border-slate-200 bg-white p-4'>
      <div class='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 class='text-base font-semibold text-slate-800'>
            {t("roundSummary.title")}
          </h3>
          <p class='mt-1 text-sm text-slate-500'>
            {t("roundSummary.description")}
          </p>
        </div>
        <button
          type='button'
          class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60'
          disabled={rerunningSg()}
          onClick={() => void handleRerunSg()}
        >
          {rerunningSg()
            ? t("roundSummary.rerunningSg")
            : t("roundSummary.rerunSg")}
        </button>
      </div>

      <Show when={rerunError()}>
        {(message) => (
          <p class='mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
            {message()}
          </p>
        )}
      </Show>

      <Show
        when={!summary.loading}
        fallback={
          <p class='mt-4 text-sm text-slate-500'>
            {t("roundSummary.loading")}
          </p>
        }
      >
        <Show
          when={!summary.error && summary()}
          fallback={
            <p class='mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
              {summary.error instanceof Error
                ? summary.error.message
                : t("roundSummary.error")}
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
