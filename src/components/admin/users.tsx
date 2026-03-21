import { createResource, For, Show } from "solid-js";
import User from "./user";

import { supabase } from "../../supabase/client";

type CategoryOption = {
  id: number;
  name: string;
};

type UserType = {
  id: string | null;
  created_at: string | null;
  email: string | null;
  avatar_url: string | null;
  category: {
    id: number | null;
    name: string | null;
  };
  role: string | null;
  preferred_distance_unit: string | null;
  user_name: string | null;
};

type UserUpdates = {
  email?: string;
  avatar_url?: string | null;
  role?: string;
  preferred_distance_unit?: string;
  user_name?: string;
  category_id?: number;
};

const fetchUsers = async () => {
  const [
    { data: users, error: usersError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select(
        "id, created_at, email, avatar_url, category(id, name), role, preferred_distance_unit, user_name",
      ),
    supabase.from("category").select("id, name").order("id"),
  ]);

  if (usersError) {
    console.error("Error fetching users:", usersError);
  }

  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError);
  }

  return {
    users: users as UserType[] | null,
    categories: (categories as CategoryOption[] | null) ?? [],
  };
};

const Users = () => {
  const [users, { mutate }] = createResource(fetchUsers);

  const handleUserUpdated = (
    id: string,
    updates: UserUpdates,
  ) => {
    mutate((prev) => {
      if (!prev?.users) return prev;
      const nextCategory =
        updates.category_id == null
          ? null
          : prev.categories.find((category) => category.id === updates.category_id) ??
            null;

      return {
        ...prev,
        users: prev.users.map((u) =>
          u.id === id
            ? {
                ...u,
                ...updates,
                category:
                  nextCategory == null
                    ? u.category
                    : {
                        id: nextCategory.id,
                        name: nextCategory.name,
                      },
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
                {(user) => (
                  <User
                    user={user}
                    onUpdated={handleUserUpdated}
                    categoryOptions={users()?.categories ?? []}
                  />
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </>
  );
};

export default Users;
