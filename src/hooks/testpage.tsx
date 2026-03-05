import { createSignal, createMemo, For } from "solid-js";

type GolfCourse = {
  id: number;
  name: string;
  location: string;
};

const courses: GolfCourse[] = [
  { id: 1, name: "Pebble Beach", location: "California" },
  { id: 2, name: "St Andrews", location: "Scotland" },
  { id: 3, name: "Augusta National", location: "Georgia" },
  { id: 4, name: "Royal Melbourne", location: "Australia" },
  { id: 5, name: "Pinehurst No.2", location: "North Carolina" },
  { id: 6, name: "Whistling Straits", location: "Wisconsin" },
];

export default function CourseList() {
  const [search, setSearch] = createSignal("");
  const [page, setPage] = createSignal(1);

  const pageSize = 3;

  // 🔎 Filtered results
  const filteredCourses = createMemo(() => {
    const query = search().toLowerCase();

    return courses.filter(
      (course) =>
        course.name.toLowerCase().includes(query) ||
        course.location.toLowerCase().includes(query),
    );
  });

  // 📄 Total pages
  const totalPages = createMemo(() =>
    Math.ceil(filteredCourses().length / pageSize),
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

  return (
    <div class='p-4 space-y-4'>
      <input
        type='text'
        placeholder='Search courses...'
        class='w-full p-2 border rounded'
        onInput={(e) => handleSearch(e.currentTarget.value)}
      />

      <ul class='space-y-2'>
        <For each={paginatedCourses()}>
          {(course) => (
            <li class='p-2 border rounded'>
              <div class='font-semibold'>{course.name}</div>
              <div class='text-sm text-gray-500'>{course.location}</div>
            </li>
          )}
        </For>
      </ul>

      {/* Pagination Controls */}
      <div class='flex gap-2 items-center'>
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
          class='px-3 py-1 border rounded disabled:opacity-50'
          disabled={page() === totalPages()}
          onClick={() => setPage(page() + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
