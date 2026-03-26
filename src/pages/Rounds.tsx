import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";

import ConfirmationModal from "../components/ConfirmationModal";
import { useAuth } from "../context/AuthProvider";
import { supabase } from "../supabase/client";

type RoundListItem = {
  id: number;
  finished: boolean;
  playedDate: string;
  course: string;
  tee: string;
  score: number | null;
  sgTotal: number | null;
};

type RoundSummaryRow = {
  id: number | string | null;
  played_date: string | null;
  course: string | null;
  tee: string | null;
  finished: boolean | null;
  score: number | null;
  sg_total: number | null;
};

const PAGE_SIZE = 10;
const RECENT_ROUNDS_LIMIT = 30;

const fetchRounds = async ({
  userId,
  page,
}: {
  userId: string;
  page: number;
}) => {
  if (!userId) {
    return { hasNextPage: false, rounds: [] as RoundListItem[] };
  }

  const { data, error } = await supabase
    .rpc("get_round_summary_list", {
      p_limit: PAGE_SIZE + 1,
      p_offset: (page - 1) * PAGE_SIZE,
      p_recent_limit: RECENT_ROUNDS_LIMIT,
      p_user_id: userId,
    });

  if (error) {
    console.error("Error fetching rounds:", error);
    return { hasNextPage: false, rounds: [] as RoundListItem[] };
  }

  const pagedRows = ((data ?? []) as RoundSummaryRow[]).slice(0, PAGE_SIZE);
  const rounds = pagedRows.map((round) => ({
    id: Number(round.id),
    playedDate: round.played_date ?? "",
    course: round.course ?? "Unknown course",
    tee: round.tee ?? "Unknown tee",
    finished: Boolean(round.finished),
    score: round.score == null ? null : Number(round.score),
    sgTotal: round.sg_total == null ? null : Number(round.sg_total),
  }));

  return {
    hasNextPage: (data?.length ?? 0) > PAGE_SIZE,
    rounds,
  };
};

export default function Rounds() {
  const auth = useAuth();
  const [page, setPage] = createSignal(1);
  const [rounds, { refetch }] = createResource(
    () => ({
      page: page(),
      userId: auth.user()?.id ?? "",
    }),
    fetchRounds,
  );
  const [modalOpen, setModalOpen] = createSignal(false);
  const [selectedRoundId, setSelectedRoundId] = createSignal<number | null>(null);
  const [deletingRoundId, setDeletingRoundId] = createSignal<number | null>(null);
  const [deleteError, setDeleteError] = createSignal<string | null>(null);

  createEffect(() => {
    if (!rounds.loading && page() > 1 && (rounds()?.rounds.length ?? 0) === 0) {
      setPage((currentPage) => Math.max(1, currentPage - 1));
    }
  });

  const openDeleteModal = (roundId: number) => {
    setDeleteError(null);
    setSelectedRoundId(roundId);
    setModalOpen(true);
  };

  const deleteRound = async (roundId: number) => {
    setDeleteError(null);
    setDeletingRoundId(roundId);

    const { data, error } = await supabase
      .from("rounds")
      .delete()
      .eq("id", roundId)
      .select("id");

    setDeletingRoundId(null);

    if (error) {
      setDeleteError(`Failed to delete round: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      setDeleteError("Failed to delete round: no matching round was deleted.");
      return;
    }

    await refetch();
  };

  return (
    <>
      <ConfirmationModal
        open={modalOpen()}
        title='Delete Round'
        message='This action cannot be undone. The round, its holes, and all shots for that round will be deleted.'
        onClose={(confirmed) => {
          const roundId = selectedRoundId();
          setModalOpen(false);
          if (confirmed && roundId != null) {
            void deleteRound(roundId);
          }
        }}
      />

      <div class='mx-auto w-full max-w-5xl space-y-4'>
        <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
          <h1 class='font-rubik text-2xl font-semibold text-slate-800'>Rounds</h1>
          <p class='mt-1 text-sm text-slate-500'>
            View your latest 30 rounds in one place.
          </p>

          <Show when={deleteError()}>
            {(message) => (
              <p class='mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                {message()}
              </p>
            )}
          </Show>

          <Show
            when={!rounds.loading}
            fallback={
              <div class='mt-4 text-sm text-slate-500'>Loading rounds...</div>
            }
          >
            <Show
              when={(rounds()?.rounds.length ?? 0) > 0}
              fallback={
                <p class='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500'>
                  No rounds found.
                </p>
              }
            >
              <div class='mt-4 space-y-3 sm:hidden'>
                <For each={rounds()?.rounds}>
                  {(round) => (
                    <article class='rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm'>
                      <div class='flex items-start justify-between gap-3'>
                        <div class='min-w-0'>
                          <h2 class='truncate text-base font-semibold text-slate-800'>
                            {round.course}
                          </h2>
                          <p class='mt-1 text-sm text-slate-500'>
                            {round.playedDate}
                          </p>
                        </div>
                        <span
                          classList={{
                            "rounded-full px-2.5 py-1 text-xs font-semibold": true,
                            "bg-emerald-100 text-emerald-700": round.finished,
                            "bg-amber-100 text-amber-700": !round.finished,
                          }}
                        >
                          {round.finished ? "Completed" : "In progress"}
                        </span>
                      </div>

                      <dl class='mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700'>
                        <div>
                          <dt class='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                            Tee
                          </dt>
                          <dd class='mt-1'>{round.tee}</dd>
                        </div>
                        <div>
                          <dt class='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                            Score
                          </dt>
                          <dd class='mt-1'>{round.score ?? "-"}</dd>
                        </div>
                        <div class='col-span-2'>
                          <dt class='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                            SG Total
                          </dt>
                          <dd class='mt-1'>
                            {round.sgTotal == null
                              ? "-"
                              : round.sgTotal.toFixed(3)}
                          </dd>
                        </div>
                      </dl>

                      <div class='mt-4 grid gap-2'>
                        <Show when={!round.finished}>
                          <A
                            href={`/scorecard-entry/${round.id}`}
                            class='inline-flex items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
                          >
                            Complete
                          </A>
                        </Show>

                        <div class='grid grid-cols-2 gap-2'>
                          <A
                            href={`/dashboard/rounds/${round.id}`}
                            class='inline-flex items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
                          >
                            View
                          </A>
                          <button
                            type='button'
                            class='inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60'
                            disabled={deletingRoundId() === round.id}
                            onClick={() => openDeleteModal(round.id)}
                          >
                            {deletingRoundId() === round.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  )}
                </For>
              </div>

              <div class='mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 sm:block'>
                <table class='w-full min-w-120 text-left text-sm text-slate-700'>
                  <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
                    <tr>
                      <th scope='col' class='px-4 py-3 font-semibold'>
                        Date
                      </th>
                      <th scope='col' class='px-4 py-3 font-semibold'>
                        Course
                      </th>
                      <th scope='col' class='px-4 py-3 font-semibold'>
                        Tee
                      </th>
                      <th scope='col' class='px-4 py-3 font-semibold'>
                        Completed
                      </th>
                      <th scope='col' class='px-4 py-3 font-semibold'>
                        Score
                      </th>
                      <th scope='col' class='px-4 py-3 font-semibold'>
                        SG Total
                      </th>
                      <th
                        scope='col'
                        class='px-4 py-3 text-right font-semibold'
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={rounds()?.rounds}>
                      {(round) => (
                        <tr class='border-b border-slate-100 last:border-b-0'>
                          <td class='px-4 py-3'>{round.playedDate}</td>
                          <td class='px-4 py-3'>{round.course}</td>
                          <td class='px-4 py-3'>{round.tee}</td>
                          <td class='px-4 py-3'>
                            <div class='flex items-center gap-2'>
                              <span>{round.finished ? "Yes" : "No"}</span>
                              <Show when={!round.finished}>
                                <A
                                  href={`/scorecard-entry/${round.id}`}
                                  class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-100'
                                >
                                  Complete
                                </A>
                              </Show>
                            </div>
                          </td>
                          <td class='px-4 py-3'>{round.score ?? "-"}</td>
                          <td class='px-4 py-3'>
                            {round.sgTotal == null
                              ? "-"
                              : round.sgTotal.toFixed(3)}
                          </td>
                          <td class='px-4 py-3 text-right'>
                            <div class='flex justify-end gap-2'>
                              <A
                                href={`/dashboard/rounds/${round.id}`}
                                class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
                              >
                                View
                              </A>
                              <button
                                type='button'
                                class='inline-flex rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60'
                                disabled={deletingRoundId() === round.id}
                                onClick={() => openDeleteModal(round.id)}
                              >
                                {deletingRoundId() === round.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class='mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4'>
                <p class='text-sm text-slate-500'>
                  Page {page()} of recent rounds
                </p>
                <div class='flex items-center gap-2'>
                  <button
                    type='button'
                    class='inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                    disabled={page() === 1 || rounds.loading}
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type='button'
                    class='inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                    disabled={!rounds()?.hasNextPage || rounds.loading}
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </>
  );
}
