import { createSignal, Show } from "solid-js";
import { supabase } from "../../supabase/client";

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

type CategoryOption = {
  id: number;
  name: string;
};

type UserProps = {
  user: UserType;
  onUpdated: (
    id: string,
    updates: {
      email?: string;
      avatar_url?: string | null;
      role?: string;
      preferred_distance_unit?: string;
      user_name?: string;
      category_id?: number;
    },
  ) => void;
  categoryOptions: CategoryOption[];
};

const roleOptions = ["admin", "user", "pro"] as const;
const distanceOptions = ["yards", "metres"] as const;

const getRoleBadgeClass = (role: string | null) => {
  if (role === "admin") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (role === "pro") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
};

const User = (props: UserProps) => {
  const [editing, setEditing] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  const [email, setEmail] = createSignal(props.user.email ?? "");
  const [avatar, setAvatar] = createSignal(props.user.avatar_url || "");
  const [user_name, setUser_name] = createSignal(
    props.user.user_name || "golfer",
  );
  const [role, setRole] = createSignal(props.user.role || "user");
  const [distance, setDistance] = createSignal(
    props.user.preferred_distance_unit || "yards",
  );
  const [category, setCategory] = createSignal(
    props.user.category?.id != null ? String(props.user.category.id) : "",
  );

  const resetForm = () => {
    setEmail(props.user.email ?? "");
    setAvatar(props.user.avatar_url || "");
    setUser_name(props.user.user_name || "golfer");
    setRole(props.user.role || "user");
    setDistance(props.user.preferred_distance_unit || "yards");
    setCategory(
      props.user.category?.id != null ? String(props.user.category.id) : "",
    );

    setErrorMessage("");
  };

  const saveUser = async () => {
    setErrorMessage("");
    setSaving(true);

    if (!category()) {
      setErrorMessage("Category is required.");
      setSaving(false);
      return;
    }

    const updates = {
      email: email().trim(),
      avatar_url: avatar().trim() || null,
      role: role(),
      preferred_distance_unit: distance(),
      category_id: Number(category()),
      user_name: user_name().trim(),
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

    if (props.user.id) {
      props.onUpdated(props.user.id, updates);
    }
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
          {props.user.email ?? ""}
        </th>
        <td class='px-6 py-4'>
          {props.user.created_at
            ? new Date(props.user.created_at).toLocaleDateString()
            : ""}
        </td>
        <td class='px-6 py-4'>{props.user.category?.name ?? ""}</td>
        <td class='px-6 py-4'>
          <span
            class={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClass(
              props.user.role,
            )}`}
          >
            {props.user.role ?? "user"}
          </span>
        </td>
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
                  disabled
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
                  <option value=''>Select category</option>
                  {props.categoryOptions.map((option) => (
                    <option value={String(option.id)}>{option.name}</option>
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
