import { createResource, For, Show } from "solid-js";

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
};

const getSingleRelation = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const fetchRounds = async () => {
  const { data, error } = await supabase
    .from("rounds")
    .select("id, round_date, is_finalised, courses(name), tees(color)")
    .order("round_date", { ascending: false });

  if (error) {
    console.error("Error fetching rounds:", error);
    return { rounds: [] as RoundListItem[] };
  }

  const rounds = ((data ?? []) as RoundRow[]).map((round) => ({
    id: Number(round.id),
    playedDate: round.round_date ?? "",
    course: getSingleRelation(round.courses)?.name ?? "Unknown course",
    tee: getSingleRelation(round.tees)?.color ?? "Unknown tee",
    finished: getSingleRelation(round.is_finalised ?? "Not sure"),
  }));

  return { rounds };
};

export default function Rounds() {
  const [rounds] = createResource(fetchRounds);

  return (
    <div class='mx-auto w-full max-w-5xl space-y-4'>
      <div class='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
        <h1 class='font-rubik text-2xl font-semibold text-slate-800'>Rounds</h1>
        <p class='mt-1 text-sm text-slate-500'>
          View all recorded rounds in one place.
        </p>

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
              <table class='w-full min-w-120 text-left text-sm text-slate-700'>
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
                          {round.finished ? "Yes" : "No"}
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
  );
}
