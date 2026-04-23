import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useTransContext } from "@mbarzda/solid-i18next";

import { TCourse, TTee } from "../lib/definitions";
import { supabase } from "../supabase/client";
import { toDMYDash, toSlash } from "../hooks/useDateFormat";
import { useAuth } from "../context/AuthProvider";

type CoursesResult = {
  data: TCourse[];
  error: string | null;
};

type TeesResult = {
  data: TTee[];
  error: string | null;
};

const fetchCourses = async (): Promise<CoursesResult> => {
  const startedAt = performance.now();
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, city")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching courses:", error);
    return { data: [], error: error.message };
  }

  console.info(
    `NewRound: fetched ${(data ?? []).length} courses in ${Math.round(
      performance.now() - startedAt,
    )}ms`,
  );

  return { data: (data as TCourse[]) ?? [], error: null };
};

const fetchTees = async (courseId: number): Promise<TeesResult> => {
  const startedAt = performance.now();
  const { data, error } = await supabase
    .from("tees")
    .select("id, color, total_yardage, course_id")
    .order("total_yardage", { ascending: false })
    .eq("course_id", courseId);

  if (error) {
    console.error("Error fetching tees:", error);
    return { data: [], error: error.message };
  }

  console.info(
    `NewRound: fetched ${(data ?? []).length} tees for course ${courseId} in ${Math.round(
      performance.now() - startedAt,
    )}ms`,
  );

  return { data: (data as TTee[]) ?? [], error: null };
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
  const [t] = useTransContext();
  const [courses] = createResource(fetchCourses);
  const [unfinishedRounds, { refetch: refetchUnfinishedRounds }] =
    createResource(
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
  const [coursesTakingTooLong, setCoursesTakingTooLong] = createSignal(false);
  const [coursesError, setCoursesError] = createSignal("");
  const [teesError, setTeesError] = createSignal("");

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

  createEffect(() => {
    if (!courses.loading) {
      setCoursesTakingTooLong(false);
      setCoursesError(courses()?.error ?? "");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCoursesTakingTooLong(true);
    }, 8000);

    onCleanup(() => {
      window.clearTimeout(timeoutId);
    });
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCourseSelect = async (id: string, name: string) => {
    setStartError("");
    setTeesError("");
    setSelectedCourse({ id, name });
    setSelectedTee({ id: "", color: "" });
    setTees([]);

    const numericCourseId = Number(id);
    if (Number.isNaN(numericCourseId)) {
      setStartError(t("newRound.errors.invalidCourse"));
      return;
    }

    const result = await fetchTees(numericCourseId);
    setTees(result.data ?? []);
    setTeesError(result.error ?? "");
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
      setStartError(t("newRound.errors.signInRequired"));
      return;
    }

    if (!selectedCourse().id || !selectedTee().id || !roundDate()) {
      setStartError(t("newRound.errors.missingSelection"));
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
        t("newRound.errors.createRound", {
          message: roundError?.message ?? t("errors.unknown"),
        }),
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
          ? t("newRound.errors.loadHoles", { message: holesError.message })
          : t("newRound.errors.noHoles"),
      );
      return;
    }

    const holeRoundRows = holes.map((hole) => ({
      round_id: round.id,
      hole_id: hole.id,
      score: 0,
      completed: false,
    }));

    const { error: roundHolesError } = await supabase
      .from("round_holes")
      .insert(holeRoundRows);

    if (roundHolesError) {
      await supabase.from("rounds").delete().eq("id", round.id);
      setStartingRound(false);
      setStartError(
        t("newRound.errors.initializeHoles", {
          message: roundHolesError.message,
        }),
      );
      return;
    }

    setStartingRound(false);
    navigate(`/scorecard-entry/${round.id}`);
  };

  const getCourseName = (round: any) => {
    if (Array.isArray(round.courses))
      return round.courses[0]?.name ?? t("newRound.unknownCourse");
    return round.courses?.name ?? t("newRound.unknownCourse");
  };

  const handleContinueRound = (roundId: string) => {
    navigate(`/scorecard-entry/${roundId}`);
  };

  const handleDeleteRound = async (roundId: string) => {
    if (deletingRoundId()) return;
    setStartError("");
    setDeletingRoundId(roundId);

    const { error: deleteHoleRoundError } = await supabase
      .from("round_holes")
      .delete()
      .eq("round_id", roundId);

    console.log(roundId);

    if (deleteHoleRoundError) {
      setDeletingRoundId("");
      setStartError(
        t("newRound.errors.deleteRoundHoles", {
          message: deleteHoleRoundError.message,
        }),
      );
      return;
    }

    const { error: deleteRoundError } = await supabase
      .from("rounds")
      .delete()
      .eq("id", roundId);

    if (deleteRoundError) {
      setDeletingRoundId("");
      setStartError(
        t("newRound.errors.deleteRound", {
          message: deleteRoundError.message,
        }),
      );
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
            {t("newRound.incompleteRounds")}
          </h1>
          <p class='mt-2 font-grotesk text-sm text-slate-500'>
            {t("newRound.incompleteRoundsDescription")}
          </p>
          <For each={unfinishedRounds()}>
            {(round) => (
              <div class='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                <div>
                  <p class='font-grotesk text-sm font-semibold text-slate-800'>
                    {getCourseName(round)}
                  </p>
                  <p class='font-grotesk text-sm text-slate-500'>
                    {t("common.date")}: {round.round_date}
                  </p>
                </div>
                <div class='flex items-center gap-2'>
                  <button
                    type='button'
                    class='rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
                    onClick={() => handleContinueRound(String(round.id))}
                  >
                    {t("newRound.continue")}
                  </button>
                  <button
                    type='button'
                    class='rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60'
                    disabled={deletingRoundId() === String(round.id)}
                    onClick={() => handleDeleteRound(String(round.id))}
                  >
                    {deletingRoundId() === String(round.id)
                      ? t("newRound.deleting")
                      : t("common.delete")}
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
      <div class='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
        <h1 class='font-rubik text-3xl font-semibold tracking-tight text-slate-800'>
          {t("newRound.title")}
        </h1>
        <p class='mt-2 font-grotesk text-sm text-slate-500'>
          {t("newRound.description")}
        </p>
      </div>

      <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
        <label class='block max-w-xs'>
          <span class='mb-1 block text-sm font-medium text-slate-700'>
            {t("newRound.roundDate")}
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
            {t("common.course")}
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            {t("newRound.courseDescription")}
          </p>

          <div class='mt-4'>
            <input
              type='text'
              placeholder={t("newRound.searchCourses")}
              class='w-full max-w-md rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
              onInput={(e) => handleSearch(e.currentTarget.value)}
            />
          </div>

          <div class='mt-4 overflow-hidden rounded-xl border border-slate-200'>
            <Show
              when={!courses.loading}
              fallback={
                <div class='flex min-h-40 flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center'>
                  <div class='lds-dual-ring'></div>
                  <p class='font-grotesk text-sm text-slate-600'>
                    {t("newRound.loadingCourses")}
                  </p>
                  <Show when={coursesTakingTooLong()}>
                    <div class='space-y-3'>
                      <p class='max-w-md text-sm text-slate-500'>
                        {t("newRound.courseLoadSlow")}
                      </p>
                      <button
                        type='button'
                        class='mx-auto rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'
                        onClick={() => window.location.reload()}
                      >
                        {t("newRound.reloadPage")}
                      </button>
                    </div>
                  </Show>
                </div>
              }
            >
              <Show
                when={!coursesError()}
                fallback={
                  <div class='bg-rose-50 p-4 text-sm text-rose-700'>
                    {t("newRound.errors.loadCourses", {
                      message: coursesError(),
                    })}
                  </div>
                }
              >
                <Show
                  when={paginatedCourses().length > 0}
                  fallback={
                    <div class='bg-slate-50 p-4 text-sm text-slate-500'>
                      {t("newRound.noCourses")}
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
              </Show>
            </Show>
          </div>

          <div class='mt-3 flex items-center justify-center gap-3'>
            <button
              class='rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50'
              disabled={page() === 1}
              onClick={() => setPage(page() - 1)}
            >
              {t("common.previous")}
            </button>

            <span class='font-grotesk text-sm text-slate-600'>
              {t("common.pageOf", { page: page(), total: totalPages() })}
            </span>

            <button
              class='rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50'
              disabled={page() >= totalPages()}
              onClick={() => setPage(page() + 1)}
            >
              {t("common.next")}
            </button>
          </div>
        </div>

        <div class='mt-8 border-t border-slate-200 pt-6'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            {t("common.tee")}
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            {t("newRound.teeDescription")}
          </p>

          <Show
            when={tees().length > 0}
            fallback={
              <p class={`mt-3 text-sm ${teesError() ? "text-rose-700" : "text-slate-500"}`}>
                {teesError()
                  ? t("newRound.errors.loadTees", { message: teesError() })
                  : t("newRound.selectCourseForTees")}
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
                      {tee.color} ({tee.total_yardage} {t("units.metres")})
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div class='mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <h3 class='font-rubik text-lg font-semibold text-slate-800'>
            {t("newRound.selectionSummary")}
          </h3>
          <p class='mt-2 text-sm text-slate-700'>
            {t("common.course")}:{" "}
            <span class='font-medium'>
              {selectedCourse().name || t("newRound.notSelected")}
            </span>
          </p>
          <p class='text-sm text-slate-700'>
            {t("common.tee")}:{" "}
            <span class='font-medium'>
              {selectedTee().color || t("newRound.notSelected")}
            </span>
          </p>
          <p class='text-sm text-slate-700'>
            {t("common.date")}:{" "}
            <span class='font-medium'>
              {roundDate() ? toDMYDash(roundDate()) : t("newRound.notSelected")}
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
          {startingRound() ? t("newRound.starting") : t("newRound.startRound")}
        </button>
      </div>
    </div>
  );
}
