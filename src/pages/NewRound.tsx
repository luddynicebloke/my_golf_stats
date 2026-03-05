import {
  createResource,
  createSignal,
  For,
  Show,
  createMemo,
  onMount,
} from "solid-js";
import { TCourse, TTee } from "../lib/definitions";
import { supabase } from "../supabase/client";
import { toSlash, toDMYDash } from "../hooks/useDateFormat";
import { useNavigate } from "@solidjs/router";

import LoadingCss from "../components/LoadingCss";

import { useAuth } from "../context/AuthProvider";

const fetchCourses = async () => {
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, city ")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching courses:", error);
  }

  return { data: data as TCourse[] };
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

  return { data: data as TTee[] };
};

export default function NewRound() {
  const [courses] = createResource(fetchCourses);
  const [roundDate, setRoundDate] = createSignal("");
  const [search, setSearch] = createSignal("");
  const [page, setPage] = createSignal(1);
  const [tees, setTees] = createSignal<TTee[]>([]);
  const [selectedCourse, setSelectedCourse] = createSignal({
    id: "",
    name: "",
  });
  const [selectedTee, setSelectedTee] = createSignal({ id: "", color: "" });
  const auth = useAuth();

  const navigate = useNavigate();

  // set the number of records per page
  const pageSize = 5;

  // 🔎 Filtered results
  const filteredCourses = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return courses()?.data ?? [];
    return (
      courses()?.data.filter((course) =>
        course.name.toLowerCase().includes(q),
      ) ?? []
    );
  });

  // 3️⃣ Paginate
  const totalPages = createMemo(() =>
    Math.ceil(filteredCourses()!.length / pageSize),
  );

  // 📦 Paginated slice
  const paginatedCourses = createMemo(() => {
    const start = (page() - 1) * pageSize;
    const end = start + pageSize;
    return filteredCourses().slice(start, end);
  });

  // 🔁 Reset page when search changes
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCourseSelect = (id: string, name: string) => {
    fetchTees(parseInt(id)).then((res) => {
      if (res.data) {
        setTees(res.data);
        setSelectedCourse({ id, name });
      }
    });
  };

  const handleTeeSelect = (id: string, color: string) => {
    setSelectedTee({ id, color });
  };

  const handleStartRound = async () => {
    //STEP 1: Create new round in database
    const { data: round, error } = await supabase
      .from("rounds")
      .insert({
        user_id: auth.user()?.id,
        course_id: selectedCourse().id,
        tee_id: selectedTee().id,
        round_date: toSlash(roundDate()), // convert "YYYY-MM-DD" to "YYYY/MM/DD" for database
      })
      .select()
      .single();
    if (error) {
      console.error("Error starting new round:", error);
    } else {
      console.log("New round started:", round);
    }

    // STEP 2: WE NOW HAVE THE ROUND id SO WE WILL FETCH HOLES FOR THE SELECTED TEE
    const { data: holes, error: holesError } = await supabase
      .from("holes")
      .select("id, hole_number")
      .eq("course_id", selectedCourse().id)
      .order("hole_number");

    if (holesError) {
      console.error("Error fetching holes:", holesError);
    } else {
      console.log("Holes for selected course:", holes);
    }

    // STEP3: NOW ENTER THE HOLES FOR THE ROUND
    // we will create a new entry in the "round_holes" table for each hole, linking it to
    // the round_id and hole_id.
    // the round will be initialised with 0 strokes and completed = false, and the user will
    // update these as they enter their scorecard.
    const holeRoundRows = holes?.map((hole) => ({
      round_id: round.id, // the id of the round we just created
      hole_id: hole.id,
      strokes: 0, // initialize strokes to 0
      completed: false, // initialize completed to false
    }));

    // Insert all the round_holes entries created above into the database
    const { error: roundHolesError } = await supabase
      .from("hole_round")
      .insert(holeRoundRows);

    if (roundHolesError) {
      console.error("Error inserting round holes:", roundHolesError);
    } else {
      console.log("Successfully inserted round holes");
    }

    // navigate to scorecard entry page with selected course and tee
    navigate(`/scorecard-entry/${round.id}`);
  };

  return (
    <>
      <div class='mx-auto w-full sm:w-3/4 flex flex-col justify-center items-center'>
        <input
          type='date'
          class=' rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring'
          value={roundDate()}
          onInput={(e) => {
            const iso = (e.currentTarget as HTMLInputElement).value; // "YYYY-MM-DD"
            setRoundDate(iso); // "YYYY-MM-DD"
          }}
        />
        <div class='mt-1 flex justify-center'>
          <div class='w-full max-w-4xl space-y-10'>
            <Show when={courses()?.data?.length === 0}>
              <p>Loading courses...</p>
            </Show>

            <Show when={paginatedCourses()} fallback={<LoadingCss />}>
              <div>
                <input
                  type='text'
                  placeholder='Search courses...'
                  class='w-full max-w-md p-2 border rounded mb-2'
                  onInput={(e) => handleSearch(e.currentTarget.value)}
                />
                <table class='w-full  text-sm text-neutral-00'>
                  <tbody class=''>
                    <For each={paginatedCourses()}>
                      {(course) => (
                        <tr
                          class='cursor-pointer'
                          onClick={() =>
                            handleCourseSelect(course.id, course.name)
                          }
                        >
                          <td class='text-right w-1/2'>{course.name}</td>

                          <td class='px-6 py-1 text-left w-1/2'>
                            {course.city}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div class='flex gap-2 justify-center items-center mt-1'>
                <button
                  class='px-3 py-1 border rounded disabled:opacity-50'
                  disabled={page() === 1}
                  onClick={() => setPage(page() - 1)}
                >
                  Prev
                </button>

                <span>
                  Page {page()} of {totalPages()}
                </span>

                <button
                  class='px-1 py-1 border rounded disabled:opacity-50'
                  disabled={page() === totalPages()}
                  onClick={() => setPage(page() + 1)}
                >
                  Next
                </button>
              </div>
            </Show>
            <div class='border-t pt-1 flex flex-col'>
              <Show when={tees().length > 0}>
                <div class=' mt-2'>
                  <h2 class='text-lg font-bold'>Select a tee:</h2>
                  <ul class=' pl-5 gap-2'>
                    <For each={tees()}>
                      {(tee) => (
                        <li
                          class='py-1 cursor-pointer'
                          onClick={() => handleTeeSelect(tee.id, tee.color)}
                        >
                          {tee.color} ({tee.total_yardage} metres)
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
              </Show>

              <div class='mt-4'>
                <h2 class='text-lg font-bold mt-2'>Selected Course and Tee:</h2>
                <p>
                  Course: {selectedCourse().name || "...."} Tee:{" "}
                  {selectedTee().color || "...."}
                </p>
                <p>Played {roundDate() ? toDMYDash(roundDate()) : "...."}</p>
              </div>
              <button
                class={`mt-4 px-4 py-2 disabled:opacity-50 text-white rounded ${!selectedTee().color ? "cursor-not-allowed" : ""}`}
                disabled={
                  !selectedTee().color || !roundDate() || !selectedCourse().name
                }
                onClick={handleStartRound}
              >
                Start round
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
