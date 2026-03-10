import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";

import { TCourse, TTee } from "../lib/definitions";
import { supabase } from "../supabase/client";
import { toDMYDash, toSlash } from "../hooks/useDateFormat";
import { useAuth } from "../context/AuthProvider";
import LoadingCss from "../components/LoadingCss";

const fetchCourses = async () => {
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, city")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching courses:", error);
  }

  return { data: (data as TCourse[]) ?? [] };
};

const fetchTees = async (courseId: number) => {
  const { data, error } = await supabase
    .from("tees")
    .select("id, color, total_yardage, course_id")
    .order("total_yardage", { ascending: false })
    .eq("course_id", courseId);

  if (error) {
    console.error("Error fetching tees:", error);
  }

  return { data: (data as TTee[]) ?? [] };
};

const fetchUnfinishedRounds = async (userId: string) => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("rounds")
    .select(
      `id,
      round_date,
      courses!inner(name)
      `,
    )
    .eq("user_id", userId)
    .eq("is_finalised", false);

  if (error) {
    console.error("Error fetching unfinished rounds:", error);
    return [];
  }

  return data ?? [];
};

export default function NewRound() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [courses] = createResource(fetchCourses);
  const [unfinishedRounds, { refetch: refetchUnfinishedRounds }] = createResource(
    () => auth.user()?.id,
    async (userId) => (userId ? fetchUnfinishedRounds(userId) : []),
  );
  const [roundDate, setRoundDate] = createSignal("");
  const [search, setSearch] = createSignal("");
  const [page, setPage] = createSignal(1);
  const [tees, setTees] = createSignal<TTee[]>([]);
  const [selectedCourse, setSelectedCourse] = createSignal<{
    id: string;
    name: string;
  }>({
    id: "",
    name: "",
  });
  const [selectedTee, setSelectedTee] = createSignal<{
    id: string;
    color: string;
  }>({
    id: "",
    color: "",
  });
  const [startingRound, setStartingRound] = createSignal(false);
  const [deletingRoundId, setDeletingRoundId] = createSignal<string>("");
  const [startError, setStartError] = createSignal("");

  const pageSize = 5;

  const filteredCourses = createMemo(() => {
    const q = search().trim().toLowerCase();
    const all = courses()?.data ?? [];
    if (!q) return all;

    return all.filter((course) =>
      `${course.name} ${course.city ?? ""}`.toLowerCase().includes(q),
    );
  });

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(filteredCourses().length / pageSize)),
  );

  const paginatedCourses = createMemo(() => {
    const start = (page() - 1) * pageSize;
    return filteredCourses().slice(start, start + pageSize);
  });

  const canStartRound = createMemo(() =>
    Boolean(
      auth.user()?.id &&
      selectedCourse().id &&
      selectedTee().id &&
      roundDate() &&
      !startingRound(),
    ),
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCourseSelect = async (id: string, name: string) => {
    setStartError("");
    setSelectedCourse({ id, name });
    setSelectedTee({ id: "", color: "" });
    setTees([]);

    const numericCourseId = Number(id);
    if (Number.isNaN(numericCourseId)) {
      setStartError("Invalid course selected.");
      return;
    }

    const result = await fetchTees(numericCourseId);
    setTees(result.data ?? []);
  };

  const handleTeeSelect = (id: string, color: string) => {
    setStartError("");
    setSelectedTee({ id, color });
  };

  const handleStartRound = async () => {
    if (startingRound()) return;
    setStartError("");

    const currentUser = auth.user();
    if (!currentUser?.id) {
      setStartError("You must be signed in to start a round.");
      return;
    }

    if (!selectedCourse().id || !selectedTee().id || !roundDate()) {
      setStartError("Select date, course, and tee before starting.");
      return;
    }

    setStartingRound(true);

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        user_id: currentUser.id,
        course_id: selectedCourse().id,
        tee_id: selectedTee().id,
        round_date: toSlash(roundDate()),
      })
      .select("id")
      .single();

    if (roundError || !round?.id) {
      setStartingRound(false);
      setStartError(
        `Failed to create round: ${roundError?.message ?? "Unknown error."}`,
      );
      return;
    }

    const { data: holes, error: holesError } = await supabase
      .from("holes")
      .select("id, hole_number")
      .eq("course_id", selectedCourse().id)
      .order("hole_number");

    if (holesError || !holes?.length) {
      await supabase.from("rounds").delete().eq("id", round.id);
      setStartingRound(false);
      setStartError(
        holesError
          ? `Failed to load holes: ${holesError.message}`
          : "No holes found for the selected course.",
      );
      return;
    }

    const holeRoundRows = holes.map((hole) => ({
      round_id: round.id,
      hole_id: hole.id,
      strokes: 0,
      completed: false,
    }));

    const { error: roundHolesError } = await supabase
      .from("hole_round")
      .insert(holeRoundRows);

    if (roundHolesError) {
      await supabase.from("rounds").delete().eq("id", round.id);
      setStartingRound(false);
      setStartError(`Failed to initialize holes: ${roundHolesError.message}`);
      return;
    }

    setStartingRound(false);
    navigate(`/scorecard-entry/${round.id}`);
  };

  const getCourseName = (round: any) => {
    if (Array.isArray(round.courses)) return round.courses[0]?.name ?? "Unknown course";
    return round.courses?.name ?? "Unknown course";
  };

  const handleContinueRound = (roundId: string) => {
    navigate(`/scorecard-entry/${roundId}`);
  };

  const handleDeleteRound = async (roundId: string) => {
    if (deletingRoundId()) return;
    setStartError("");
    setDeletingRoundId(roundId);

    const { error: deleteHoleRoundError } = await supabase
      .from("hole_round")
      .delete()
      .eq("round_id", roundId);

    if (deleteHoleRoundError) {
      setDeletingRoundId("");
      setStartError(`Failed to delete round holes: ${deleteHoleRoundError.message}`);
      return;
    }

    const { error: deleteRoundError } = await supabase
      .from("rounds")
      .delete()
      .eq("id", roundId);

    if (deleteRoundError) {
      setDeletingRoundId("");
      setStartError(`Failed to delete round: ${deleteRoundError.message}`);
      return;
    }

    await refetchUnfinishedRounds();
    setDeletingRoundId("");
  };

  return (
    <div class='mx-auto w-full max-w-5xl space-y-6'>
      <Show when={(unfinishedRounds()?.length ?? 0) > 0}>
        <div class='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h1 class='font-rubik text-3xl font-semibold tracking-tight text-slate-800'>
            Incomplete Rounds
          </h1>
          <p class='mt-2 font-grotesk text-sm text-slate-500'>
            Continue where you left off or delete an unfinished round.
          </p>
          <For each={unfinishedRounds()}>
            {(round) => (
              <div class='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <div>
                  <p class='font-grotesk text-sm font-semibold text-slate-800'>
                    {getCourseName(round)}
                  </p>
                  <p class='font-grotesk text-sm text-slate-500'>
                    Date: {round.round_date}
                  </p>
                </div>
                <div class='flex items-center gap-2'>
                  <button
                    type='button'
                    class='rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
                    onClick={() => handleContinueRound(String(round.id))}
                  >
                    Continue
                  </button>
                  <button
                    type='button'
                    class='rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60'
                    disabled={deletingRoundId() === String(round.id)}
                    onClick={() => handleDeleteRound(String(round.id))}
                  >
                    {deletingRoundId() === String(round.id) ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
      <div class='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
        <h1 class='font-rubik text-3xl font-semibold tracking-tight text-slate-800'>
          Start New Round
        </h1>
        <p class='mt-2 font-grotesk text-sm text-slate-500'>
          Choose date, course, and tee to create your scorecard.
        </p>
      </div>

      <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
        <label class='block max-w-xs'>
          <span class='mb-1 block text-sm font-medium text-slate-700'>
            Round Date
          </span>
          <input
            type='date'
            class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800'
            value={roundDate()}
            onInput={(e) =>
              setRoundDate((e.currentTarget as HTMLInputElement).value)
            }
          />
        </label>

        <div class='mt-6'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            Course
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            Search and select a course to load available tees.
          </p>

          <div class='mt-4'>
            <input
              type='text'
              placeholder='Search courses...'
              class='w-full max-w-md rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
              onInput={(e) => handleSearch(e.currentTarget.value)}
            />
          </div>

          <div class='mt-4 overflow-hidden rounded-xl border border-slate-200'>
            <Show
              when={!courses.loading}
              fallback={
                <div class='p-4'>
                  <LoadingCss />
                </div>
              }
            >
              <table class='w-full text-sm text-slate-700'>
                <tbody>
                  <For each={paginatedCourses()}>
                    {(course) => (
                      <tr
                        class={`cursor-pointer border-b border-slate-100 last:border-b-0 ${
                          selectedCourse().id === course.id
                            ? "bg-cyan-50"
                            : "bg-white hover:bg-slate-50"
                        }`}
                        onClick={() =>
                          handleCourseSelect(course.id, course.name)
                        }
                      >
                        <td class='px-4 py-3 font-medium text-slate-800'>
                          {course.name}
                        </td>
                        <td class='px-4 py-3 text-slate-500'>
                          {course.city || "-"}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </div>

          <div class='mt-3 flex items-center justify-center gap-3'>
            <button
              class='rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50'
              disabled={page() === 1}
              onClick={() => setPage(page() - 1)}
            >
              Prev
            </button>

            <span class='font-grotesk text-sm text-slate-600'>
              Page {page()} of {totalPages()}
            </span>

            <button
              class='rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50'
              disabled={page() >= totalPages()}
              onClick={() => setPage(page() + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <div class='mt-8 border-t border-slate-200 pt-6'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>Tee</h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            Select the tee color you played.
          </p>

          <Show
            when={tees().length > 0}
            fallback={
              <p class='mt-3 text-sm text-slate-500'>
                Select a course to view tees.
              </p>
            }
          >
            <ul class='mt-4 grid gap-2 sm:grid-cols-2'>
              <For each={tees()}>
                {(tee) => (
                  <li>
                    <button
                      type='button'
                      class={`w-full rounded-md border px-3 py-2 text-left text-sm font-medium ${
                        selectedTee().id === tee.id
                          ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => handleTeeSelect(tee.id, tee.color)}
                    >
                      {tee.color} ({tee.total_yardage} metres)
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div class='mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <h3 class='font-rubik text-lg font-semibold text-slate-800'>
            Selection Summary
          </h3>
          <p class='mt-2 text-sm text-slate-700'>
            Course:{" "}
            <span class='font-medium'>
              {selectedCourse().name || "Not selected"}
            </span>
          </p>
          <p class='text-sm text-slate-700'>
            Tee:{" "}
            <span class='font-medium'>
              {selectedTee().color || "Not selected"}
            </span>
          </p>
          <p class='text-sm text-slate-700'>
            Date:{" "}
            <span class='font-medium'>
              {roundDate() ? toDMYDash(roundDate()) : "Not selected"}
            </span>
          </p>
        </div>

        <Show when={startError()}>
          <p class='mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
            {startError()}
          </p>
        </Show>

        <button
          class='mt-5 inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60'
          disabled={!canStartRound()}
          onClick={handleStartRound}
        >
          {startingRound() ? "Starting..." : "Start Round"}
        </button>
      </div>
    </div>
  );
}
