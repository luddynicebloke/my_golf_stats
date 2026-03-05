import { createSignal, Match, Switch } from "solid-js";

import Courses from "../components/admin/courses";
import Users from "../components/admin/users";
import { A } from "@solidjs/router";

type View = "courses" | "add_course" | "users" | "other";

const AdminPanel = () => {
  const [view, setView] = createSignal<View>("courses");

  return (
    <div class='container flex flex-col mx-auto p-4 justify-center items-center gap-6'>
      <h1 class='text-2xl font-bold mb-4'>Admin Panel</h1>
      <div class='flex mx-auto justify-center space-x-3'>
        <A href='/dashboard' class='solid_A mx-auto w-max'>
          Back to Dashboard
        </A>
      </div>
      <div class='flex mx-auto justify-center space-x-3'>
        <button onClick={() => setView("courses")} class='p-2'>
          Course list
        </button>

        <button onClick={() => setView("users")} class='p-2'>
          Users
        </button>
        <button onClick={() => setView("other")} class='p-2'>
          Other
        </button>
      </div>
      {view() === "courses" && <Courses />}
      {view() === "add_course" && <div>Add Course</div>}
      {view() === "users" && <Users />}
      {view() === "other" && <div>Other</div>}
    </div>
  );
};

export default AdminPanel;
