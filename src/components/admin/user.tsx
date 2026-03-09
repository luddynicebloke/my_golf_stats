import { createSignal, Show } from "solid-js";
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

type UserProps = {
  user: UserType;
  onUpdated: (
    id: string,
    updates: Partial<Omit<UserType, "id" | "created_at">>,
  ) => void;
};

const roleOptions = ["admin", "user"] as const;
const distanceOptions = ["yards", "meters"] as const;
const categoryOptions = [
  "Pro M",
  "Am M",
  "Senior M",
  "Pro F",
  "Am F",
  "Senior F",
] as const;

const User = (props: UserProps) => {
  const [editing, setEditing] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  const [email, setEmail] = createSignal(props.user.email);
  const [avatar, setAvatar] = createSignal(props.user.avatar_url || "");
  const [user_name, setUser_name] = createSignal(
    props.user.user_name || "golfer",
  );
  const [role, setRole] = createSignal(props.user.role || "user");
  const [distance, setDistance] = createSignal(
    props.user.preferred_distance_unit || "yards",
  );
  const [category, setCategory] = createSignal(props.user.category || "Am M");

  const resetForm = () => {
    setEmail(props.user.email);
    setAvatar(props.user.avatar_url || "");
    setUser_name(props.user.user_name);
    setRole(props.user.role || "user");
    setDistance(props.user.preferred_distance_unit || "yards");
    setCategory(props.user.category || "Am M");

    setErrorMessage("");
  };

  const saveUser = async () => {
    setErrorMessage("");
    setSaving(true);
    const updates = {
      email: email().trim(),
      avatar_url: avatar().trim(),
      role: role(),
      preferred_distance_unit: distance(),
      category: category(),
      user_name: user_name(),
    };

    const { error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", props.user.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    props.onUpdated(props.user.id, updates);
    setEditing(false);
    setSaving(false);
  };

  return (
    <>
      <tr class='border-b border-slate-200 odd:bg-white even:bg-slate-50'>
        <th
          scope='row'
          class='whitespace-nowrap px-6 py-4 font-medium text-slate-700'
        >
          {props.user.email}
        </th>
        <td class='px-6 py-4'>
          {new Date(props.user.created_at).toLocaleDateString()}
        </td>
        <td class='px-6 py-4'>{props.user.category}</td>
        <td class='px-6 py-4'>{props.user.role}</td>
        <td class='px-6 py-4'>{props.user.preferred_distance_unit}</td>
        <td class='px-6 py-4'>{props.user.avatar_url}</td>
        <td class='px-6 py-4'>{props.user.user_name}</td>
        <td class='px-6 py-4'>
          <button
            onClick={() => {
              if (editing()) {
                resetForm();
                setEditing(false);
              } else {
                setEditing(true);
              }
            }}
            class='inline-flex self-auto rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100'
          >
            {editing() ? "Close" : "Edit"}
          </button>
        </td>
      </tr>

      <Show when={editing()}>
        <tr class='border-b border-slate-200 bg-slate-50'>
          <td colSpan={7} class='px-6 py-4'>
            <div class='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
              <label class='block'>
                <span class='mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Email
                </span>
                <input
                  type='email'
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800 placeholder:text-slate-400'
                />
              </label>

              <label class='block'>
                <span class='mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Avatar
                </span>
                <input
                  type='text'
                  value={avatar()}
                  onInput={(e) => setAvatar(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800 placeholder:text-slate-400'
                />
              </label>
              <label class='block'>
                <span class='mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  User name
                </span>
                <input
                  type='text'
                  value={user_name()}
                  onInput={(e) => setUser_name(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800 placeholder:text-slate-400'
                />
              </label>

              <label class='block'>
                <span class='mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Role
                </span>
                <select
                  value={role()}
                  onChange={(e) => setRole(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800'
                >
                  {roleOptions.map((r) => (
                    <option value={r}>{r}</option>
                  ))}
                </select>
              </label>

              <label class='block'>
                <span class='mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Distance
                </span>
                <select
                  value={distance()}
                  onChange={(e) => setDistance(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800'
                >
                  {distanceOptions.map((u) => (
                    <option value={u}>{u}</option>
                  ))}
                </select>
              </label>

              <label class='block'>
                <span class='mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Category
                </span>
                <select
                  value={category()}
                  onChange={(e) => setCategory(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800'
                >
                  {categoryOptions.map((c) => (
                    <option value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>

            <Show when={errorMessage()}>
              <p class='mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                {errorMessage()}
              </p>
            </Show>

            <div class='mt-4 flex gap-2'>
              <button
                onClick={saveUser}
                disabled={saving()}
                class='inline-flex self-auto rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60'
              >
                {saving() ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setEditing(false);
                }}
                disabled={saving()}
                class='inline-flex self-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60'
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
      </Show>
    </>
  );
};

export default User;
