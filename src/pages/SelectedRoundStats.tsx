import { useTransContext } from "@mbarzda/solid-i18next";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
} from "solid-js";

import PlayerSelector from "../components/pro/PlayerSelector";
import { StatsSections } from "../components/stats/StatsSections";
import { useAuth } from "../context/AuthProvider";
import { toDMYDash } from "../hooks/useDateFormat";
import {
  emptyStatsPageData,
  fetchSelectableRounds,
  fetchSelectedRoundStats,
} from "../supabase/shotStats";

export default function SelectedRoundStats() {
  const [t] = useTransContext();
  const auth = useAuth();
  const [selectedRoundIds, setSelectedRoundIds] = createSignal<number[]>([]);
  const selectedRoundIdSet = createMemo(
    () => new Set<number>(selectedRoundIds()),
  );
  const isReadOnly = createMemo(() => auth.isReadOnly());

  const [rounds] = createResource(
    () => auth.targetUserId() ?? "",
    async (targetUserId) => fetchSelectableRounds(targetUserId),
  );

  const [stats] = createResource(
    () => selectedRoundIds(),
    async (roundIds) =>
      roundIds.length === 0
        ? emptyStatsPageData()
        : fetchSelectedRoundStats(roundIds),
  );

  createEffect(() => {
    auth.targetUserId();
    setSelectedRoundIds([]);
  });

  const toggleRound = (roundId: number) => {
    setSelectedRoundIds((currentRoundIds) =>
      currentRoundIds.includes(roundId)
        ? currentRoundIds.filter((id) => id !== roundId)
        : [...currentRoundIds, roundId],
    );
  };

  const clearSelection = () => {
    setSelectedRoundIds([]);
  };

  const formatRoundDate = (playedDate: string) => {
    if (!playedDate) {
      return "-";
    }

    return toDMYDash(playedDate);
  };

  return (
    <div class='mx-auto w-full max-w-6xl space-y-4'>
      <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <div class='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 class='font-rubik text-2xl font-semibold text-slate-800'>
              {t("selectedStats.title")}
            </h1>
            <p class='mt-1 text-sm text-slate-500'>
              {isReadOnly() && auth.selectedPlayer()
                ? t("stats.viewingPlayer", {
                    player:
                      auth.selectedPlayer()?.user_name ||
                      auth.selectedPlayer()?.email ||
                      t("stats.selectedPlayer"),
                  })
                : t("selectedStats.description")}
            </p>
          </div>

          <Show when={selectedRoundIds().length > 0}>
            <button
              type='button'
              class='inline-flex rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
              onClick={clearSelection}
            >
              {t("selectedStats.clearSelection")}
            </button>
          </Show>
        </div>

        <Show when={isReadOnly()}>
          <div class='mt-4'>
            <PlayerSelector
              label={t("stats.viewingPlayerLabel")}
              players={auth.accessiblePlayers()}
              selectedPlayerId={auth.selectedPlayerId()}
              onChange={auth.setSelectedPlayerId}
            />
          </div>
        </Show>

        <Show
          when={!rounds.loading && (!isReadOnly() || auth.targetUserId())}
          fallback={
            <p class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>
              {isReadOnly() && !auth.targetUserId()
                ? t("stats.choosePlayer")
                : t("selectedStats.loadingRounds")}
            </p>
          }
        >
          <Show
            when={!rounds.error}
            fallback={
              <p class='mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>
                {rounds.error instanceof Error
                  ? rounds.error.message
                  : t("selectedStats.roundsError")}
              </p>
            }
          >
            <Show
              when={(rounds()?.length ?? 0) > 0}
              fallback={
                <p class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>
                  {t("selectedStats.noRounds")}
                </p>
              }
            >
              <div class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <div class='flex flex-wrap items-center justify-between gap-3 px-1 pb-3'>
                  <p class='text-sm font-semibold text-slate-700'>
                    {t("selectedStats.selectedCount", {
                      count: selectedRoundIds().length,
                    })}
                  </p>
                  <p class='text-sm text-slate-500'>
                    {t("selectedStats.selectionHint")}
                  </p>
                </div>

                <div class='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                  <For each={rounds()}>
                    {(round) => {
                      const isSelected = () => selectedRoundIdSet().has(round.id);

                      return (
                        <button
                          type='button'
                          class={`rounded-xl border p-4 text-left transition ${
                            isSelected()
                              ? "border-cyan-300 bg-cyan-50 shadow-sm ring-1 ring-cyan-100"
                              : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/50"
                          }`}
                          aria-pressed={isSelected()}
                          onClick={() => toggleRound(round.id)}
                        >
                          <span class='flex min-h-18 flex-col justify-between gap-3'>
                            <span class='block font-rubik text-base font-semibold leading-snug text-slate-800'>
                              {round.course}
                            </span>
                            <span
                              class={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-xs font-medium ${
                                isSelected()
                                  ? "border-cyan-200 bg-white text-cyan-800"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {t("common.date")}: {formatRoundDate(round.playedDate)}
                            </span>
                          </span>
                        </button>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>
          </Show>
        </Show>
      </div>

      <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <h2 class='font-rubik text-xl font-semibold text-slate-800'>
          {t("selectedStats.resultsTitle")}
        </h2>
        <p class='mt-1 text-sm text-slate-500'>
          {t("selectedStats.resultsDescription")}
        </p>

        <Show
          when={selectedRoundIds().length > 0}
          fallback={
            <p class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>
              {t("selectedStats.emptySelection")}
            </p>
          }
        >
          <Show
            when={!stats.loading}
            fallback={
              <p class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>
                {t("selectedStats.loadingStats")}
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
              <StatsSections stats={stats()} t={t} />
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
