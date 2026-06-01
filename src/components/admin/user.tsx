import { createSignal, For, Show } from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";
import { supabase } from "../../supabase/client";
import {
  fetchPlayerRoundHistory,
  type PlayerRoundHistoryItem,
} from "../../supabase/adminUsers";

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
  const [t] = useTransContext();
  const [editing, setEditing] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [historyOpen, setHistoryOpen] = createSignal(false);
  const [historyLoading, setHistoryLoading] = createSignal(false);
  const [historyError, setHistoryError] = createSignal("");
  const [roundHistory, setRoundHistory] = createSignal<
    PlayerRoundHistoryItem[] | null
  >(null);

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

  const toggleRoundHistory = async () => {
    if (historyOpen()) {
      setHistoryOpen(false);
      return;
    }

    setHistoryOpen(true);

    if (roundHistory() != null || historyLoading()) {
      return;
    }

    if (!props.user.id) {
      setHistoryError(t("admin.users.history.error"));
      return;
    }

    setHistoryError("");
    setHistoryLoading(true);

    try {
      setRoundHistory(await fetchPlayerRoundHistory(props.user.id));
    } catch (error) {
      console.error("Error fetching player round history:", error);
      setHistoryError(t("admin.users.history.error"));
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveUser = async () => {
    setErrorMessage("");
    setSaving(true);

    if (!category()) {
      setErrorMessage(t("profile.state.categoryRequired"));
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
            {editing() ? t("common.close") : t("common.edit")}
          </button>
        </td>
      </tr>

      <Show when={editing()}>
        <tr class='border-b border-slate-200 bg-slate-50'>
          <td colSpan={8} class='px-6 py-4'>
            <div class='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
              <label class='block'>
                <span class='mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  {t("forms.email")}
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
                  {t("admin.users.avatar")}
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
                  {t("profile.username")}
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
                  {t("admin.users.role")}
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
                  {t("profile.distanceUnit")}
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
                  {t("profile.category")}
                </span>
                <select
                  value={category()}
                  onChange={(e) => setCategory(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800'
                >
                  <option value=''>{t("register.selectCategory")}</option>
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
                {saving() ? t("common.saving") : t("common.save")}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setEditing(false);
                }}
                disabled={saving()}
                class='inline-flex self-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60'
              >
                {t("common.cancel")}
              </button>
              <button
                type='button'
                onClick={() => void toggleRoundHistory()}
                class='inline-flex self-auto rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-100'
              >
                {historyOpen()
                  ? t("admin.users.history.hide")
                  : t("admin.users.history.show")}
              </button>
            </div>

            <Show when={historyOpen()}>
              <div class='mt-4 rounded-lg border border-slate-200 bg-white p-4'>
                <h3 class='text-sm font-semibold text-slate-800'>
                  {t("admin.users.history.title")}
                </h3>
                <Show when={!historyLoading()} fallback={
                  <p class='mt-3 text-sm text-slate-500'>
                    {t("admin.users.history.loading")}
                  </p>
                }>
                  <Show when={!historyError()} fallback={
                    <p class='mt-3 text-sm text-rose-700'>{historyError()}</p>
                  }>
                    <Show when={(roundHistory()?.length ?? 0) > 0} fallback={
                      <p class='mt-3 text-sm text-slate-500'>
                        {t("admin.users.history.empty")}
                      </p>
                    }>
                      <div class='mt-3 overflow-x-auto'>
                        <table class='w-full text-left text-sm text-slate-700'>
                          <thead class='border-b border-slate-200 bg-slate-100'>
                            <tr>
                              <th scope='col' class='px-3 py-2 font-semibold'>
                                {t("common.date")}
                              </th>
                              <th scope='col' class='px-3 py-2 font-semibold'>
                                {t("common.course")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <For each={roundHistory()}>
                              {(round) => (
                                <tr class='border-b border-slate-100 last:border-b-0'>
                                  <td class='px-3 py-2'>{round.roundDate}</td>
                                  <td class='px-3 py-2'>
                                    {round.courseName ||
                                      t("admin.users.history.unknownCourse")}
                                  </td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </table>
                      </div>
                    </Show>
                  </Show>
                </Show>
              </div>
            </Show>
          </td>
        </tr>
      </Show>
    </>
  );
};

export default User;
