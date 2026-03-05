import { createResource, For, Show } from "solid-js";
import User from "./user";

import { supabase } from "../../supabase/client";

type UserType = {
  id: string;
  created_at: string;
  email: string;
  avatar: string;
  category: string;
  role: string;
  preferred_distance_unit: string;
};

const fetchCourses = async () => {
  const { data, error } = await supabase.from("user_profiles").select("*");

  if (error) {
    console.error("Error fetching courses:", error);
  }

  return { users: data as UserType[] };
};

const Users = () => {
  const [users] = createResource(fetchCourses);
  return (
    <>
      <div>List of users</div>
      <Show when={users()} fallback={<div>Loading...</div>}>
        <div class='relative overflow-x-auto bg-neutral-700 shadow-xs rounded-xl border'>
          <table class='w-full text-sm text-left rtl:text-right text-neutral-00'>
            <thead class='bg-neutral-900 border-b text-neutral-400'>
              <tr>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Email
                </th>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Created on
                </th>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Category
                </th>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Role
                </th>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Distances
                </th>
                <th scope='col' class='px-6 py-3 font-bold'>
                  Avatar
                </th>

                <th scope='col' class='px-6 py-3 font-bold'>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={users()?.users}>{(user) => <User user={user} />}</For>
            </tbody>
          </table>
        </div>
      </Show>
    </>
  );
};

export default Users;
