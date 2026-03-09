import { createResource, createSignal, createMemo, For, Show } from "solid-js";
import { TCourse } from "../../lib/definitions";

import { supabase } from "../../supabase/client";

import Course from "./course";
import CourseNew from "./course_new";
import LoadingCss from "../LoadingCss";

// type for sorting
type SortKey = keyof TCourse;

const fetchCourses = async () => {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching courses:", error);
  }

  return { courses: data as TCourse[] };
};

const Courses = () => {
  const [courses] = createResource(fetchCourses);
  const [search, setSearch] = createSignal("");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [sortKey, setSortKey] = createSignal<SortKey>("name");
  const [sortAsc, setSortAsc] = createSignal(true);

  // set the number of records per page
  const pageSize = 10;

  // 1️⃣ Filter

  const filteredCourses = () => {
    const q = search().trim().toLowerCase();
    if (!q) return courses()?.courses ?? [];
    return (
      courses()?.courses.filter((c) => c.name.toLowerCase().includes(q)) ?? []
    );
  };

  // 2️⃣ Sort
  const sortedData = createMemo(() => {
    const data = [...filteredCourses()];
    const key = sortKey();
    const asc = sortAsc();

    data.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return asc ? -1 : 1;
      if (aVal > bVal) return asc ? 1 : -1;
      return 0;
    });

    return data;
  });

  // 3️⃣ Paginate
  const totalPages = createMemo(() =>
    Math.ceil(sortedData().length / pageSize),
  );

  const paginatedCourses = createMemo(() => {
    const start = (currentPage() - 1) * pageSize;
    return sortedData().slice(start, start + pageSize);
  });

  const changeSort = (key: SortKey) => {
    if (sortKey() === key) {
      setSortAsc(!sortAsc());
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // Reset to page 1 when filtering changes
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <>
      <CourseNew />
      <span class='text-slate-700'>
        Number of registered courses :{" "}
        {courses()?.courses?.length ?? "Loading..."}
      </span>
      <div class='relative mt-3 overflow-x-auto rounded-xl border border-slate-200'>
        <input
          type='text'
          placeholder='Search courses...'
          class='w-full rounded-t-xl border-b border-slate-200 bg-white p-2 text-slate-800 placeholder:text-slate-400'
          onInput={(e) => handleSearch(e.currentTarget.value)}
        />
        <Show when={courses()?.courses} fallback={<LoadingCss />}>
          <table class='w-full min-w-[760px] text-left text-sm text-slate-700'>
            <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
              <tr>
                <th scope='col' class='px-6 py-3 font-bold'>
                  ID
                </th>
                <th
                  scope='col'
                  class='px-6 py-3 font-bold cursor-pointer'
                  onclick={() => changeSort("name")}
                >
                  Course name
                </th>
                <th
                  scope='col'
                  class='px-6 py-3 font-bold cursor-pointer'
                  onclick={() => changeSort("created_at")}
                >
                  Created on
                </th>
                <th
                  scope='col'
                  class='px-6 py-3 font-bold cursor-pointer'
                  onclick={() => changeSort("city")}
                >
                  City
                </th>
                <th
                  scope='col'
                  class='px-6 py-3 font-bold cursor-pointer'
                  onclick={() => changeSort("country")}
                >
                  Country
                </th>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={paginatedCourses()}>
                {(course) => <Course course={course} />}
              </For>
            </tbody>
          </table>
        </Show>
      </div>
      {/* Pagination */}
      <div class='flex justify-between gap-2 items-center mt-4'>
        <button
          class='self-auto rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50'
          disabled={currentPage() === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          Prev
        </button>

        <span>
          Page {currentPage()} of {totalPages()}
        </span>

        <button
          class='self-auto rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50'
          disabled={currentPage() === totalPages()}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
};

export default Courses;
