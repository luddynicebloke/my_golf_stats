import { useTransContext } from "@mbarzda/solid-i18next";
import { createMemo, createResource, Show } from "solid-js";

import PlayerSelector from "../components/pro/PlayerSelector";
import { StatsSections } from "../components/stats/StatsSections";
import { useAuth } from "../context/AuthProvider";
import { normalizeDistanceUnit } from "../lib/distance";
import {
  emptyStatsPageData,
  fetchRecentStatsPageData,
  recentRoundsLimit,
} from "../supabase/shotStats";

export default function Stats() {
  const [t] = useTransContext();
  const auth = useAuth();
  const isReadOnly = createMemo(() => auth.isReadOnly());
  const distanceUnit = createMemo(() =>
    normalizeDistanceUnit(auth.profile()?.preferred_distance_unit),
  );

  const [stats] = createResource(
    () => auth.targetUserId() ?? "",
    async (targetUserId) => {
      if (!targetUserId) {
        return emptyStatsPageData();
      }

      return fetchRecentStatsPageData(targetUserId);
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
                ? t("stats.viewingPlayer", {
                    player:
                      auth.selectedPlayer()?.user_name ||
                      auth.selectedPlayer()?.email ||
                      t("stats.selectedPlayer"),
                  })
                : t("stats.subtitle", { count: recentRoundsLimit })}
            </p>
          </div>
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
          when={!stats.loading && (!isReadOnly() || auth.targetUserId())}
          fallback={
            <p class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>
              {isReadOnly() && !auth.targetUserId()
                ? t("stats.choosePlayer")
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
            <StatsSections
              distanceUnit={distanceUnit()}
              stats={stats()}
              t={t}
            />
          </Show>
        </Show>
      </div>
    </div>
  );
}
