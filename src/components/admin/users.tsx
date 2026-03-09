import { createResource, For, Show } from "solid-js";
import User from "./user";

import { supabase } from "../../supabase/client";

type UserType = {
  id: string;
  created_at: string;
  email: string;
  avatar_url: string;
  category: string;
  role: string;
  preferred_distance_unit: string;
  user_name: string;
};

const fetchCourses = async () => {
  const { data, error } = await supabase.from("user_profiles").select("*");

  if (error) {
    console.error("Error fetching courses:", error);
  }

  return { users: data as UserType[] };
};

const Users = () => {
  const [users, { mutate }] = createResource(fetchCourses);

  const handleUserUpdated = (
    id: string,
    updates: Partial<Omit<UserType, "id" | "created_at">>,
  ) => {
    mutate((prev) => {
      if (!prev?.users) return prev;
      return {
        users: prev.users.map((u) =>
          u.id === id
            ? {
                ...u,
                ...updates,
              }
            : u,
        ),
      };
    });
  };

  return (
    <>
      <div class='mb-2 font-rubik text-lg font-semibold text-slate-800'>
        List of users ({users()?.users?.length})
      </div>
      <Show when={users()} fallback={<div>Loading...</div>}>
        <div class='relative overflow-x-auto rounded-xl border border-slate-200'>
          <table class='w-full min-w-245 text-left text-sm text-slate-700'>
            <thead class='border-b border-slate-200 bg-slate-100 text-slate-700'>
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
                  User name
                </th>

                <th scope='col' class='px-6 py-3 font-bold'>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={users()?.users}>
                {(user) => <User user={user} onUpdated={handleUserUpdated} />}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </>
  );
};

export default Users;
