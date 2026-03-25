import { createResource, createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";

import ConfirmationModal from "../components/ConfirmationModal";
import { useAuth } from "../context/AuthProvider";
import { supabase } from "../supabase/client";

type RoundRow = {
  id: number;
  round_date: string;
  is_finalised: boolean;
  courses:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
  tees:
    | {
        color: string;
      }
    | {
        color: string;
      }[]
    | null;
};

type RoundListItem = {
  id: number;
  finished: boolean;
  playedDate: string;
  course: string;
  tee: string;
  score: number | null;
  sgTotal: number | null;
};

const getSingleRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const fetchRounds = async (userId: string) => {
  if (!userId) {
    return { rounds: [] as RoundListItem[] };
  }

  const { data, error } = await supabase
    .from("rounds")
    .select("id, round_date, is_finalised, courses(name), tees(color)")
    .eq("user_id", userId)
    .order("round_date", { ascending: false });

  if (error) {
    console.error("Error fetching rounds:", error);
    return { rounds: [] as RoundListItem[] };
  }

  const roundIds = ((data ?? []) as RoundRow[]).map((round) => Number(round.id));
  const scoreByRoundId = new Map<number, number>();
  const sgTotalByRoundId = new Map<number, number>();

  if (roundIds.length > 0) {
    const { data: roundHoleRows, error: roundHoleError } = await supabase
      .from("round_holes")
      .select("id, round_id, score")
      .in("round_id", roundIds);

    if (roundHoleError) {
      console.error(
        "Error fetching round holes for round totals:",
        roundHoleError,
      );
    } else {
      const roundIdByRoundHoleId = new Map<number, number>();
      const roundHoleIds = (roundHoleRows ?? []).map((row) => {
        const roundHoleId = Number(row.id);
        const roundId = Number(row.round_id);
        roundIdByRoundHoleId.set(roundHoleId, roundId);

        if (row.score != null) {
          const currentScore = scoreByRoundId.get(roundId) ?? 0;
          scoreByRoundId.set(roundId, currentScore + Number(row.score));
        }

        return roundHoleId;
      });

      if (roundHoleIds.length > 0) {
        const { data: shotRows, error: shotsError } = await supabase
          .from("shots")
          .select("round_hole_id, sg_value")
          .in("round_hole_id", roundHoleIds);

        if (shotsError) {
          console.error("Error fetching SG totals:", shotsError);
        } else {
          for (const shot of shotRows ?? []) {
            if (shot.sg_value == null) continue;

            const roundHoleId = Number(shot.round_hole_id);
            const roundId = roundIdByRoundHoleId.get(roundHoleId);
            if (!roundId) continue;

            const currentTotal = sgTotalByRoundId.get(roundId) ?? 0;
            sgTotalByRoundId.set(
              roundId,
              Number((currentTotal + Number(shot.sg_value)).toFixed(3)),
            );
          }
        }
      }
    }
  }

  const rounds = ((data ?? []) as RoundRow[]).map((round) => ({
    id: Number(round.id),
    playedDate: round.round_date ?? "",
    course: getSingleRelation(round.courses)?.name ?? "Unknown course",
    tee: getSingleRelation(round.tees)?.color ?? "Unknown tee",
    finished: getSingleRelation(round.is_finalised ?? "Not sure"),
    score: scoreByRoundId.get(Number(round.id)) ?? null,
    sgTotal: sgTotalByRoundId.get(Number(round.id)) ?? null,
  }));

  return { rounds };
};

export default function Rounds() {
  const auth = useAuth();
  const [rounds, { refetch }] = createResource(
    () => auth.user()?.id ?? "",
    fetchRounds,
  );
  const [modalOpen, setModalOpen] = createSignal(false);
  const [selectedRoundId, setSelectedRoundId] = createSignal<number | null>(null);
  const [deletingRoundId, setDeletingRoundId] = createSignal<number | null>(null);
  const [deleteError, setDeleteError] = createSignal<string | null>(null);

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
            View all recorded rounds in one place.
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
              <div class='mt-4 overflow-x-auto rounded-xl border border-slate-200'>
                <table class='w-full min-w-140 text-left text-sm text-slate-700'>
                  <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
                    <tr>
                      <th scope='col' class='px-4 py-3 font-semibold'>
                        ID
                      </th>
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
                          <td class='px-4 py-3'>{round.id}</td>
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
            </Show>
          </Show>
        </div>
      </div>
    </>
  );
}
