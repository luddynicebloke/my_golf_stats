import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";
import { supabase } from "../supabase/client";
import { useAuth } from "../context/AuthProvider";
import ChangeEmailModal from "../components/profile/ChangeEmailModal";
import { distanceUnitOptions, normalizeDistanceUnit } from "../lib/distance";
import {
  fetchAssignedProIds,
  fetchAvailablePros,
  grantProAccess,
  revokeProAccess,
  type AvailablePro,
} from "../supabase/proAccess";

type SaveState = {
  type: "success" | "error";
  message: string;
} | null;

type CategoryOption = {
  code: string;
  id: number;
  name: string;
};

type ProfileData = {
  user_name: string | null;
  avatar_url: string | null;
  preferred_distance_unit: string | null;
  category: {
    id: number;
    name: string;
  } | null;
};

const Profile = () => {
  const { user, refreshProfile } = useAuth();
  const [t] = useTransContext();
  let hasLoadedProfileOnce = false;

  const [loading, setLoading] = createSignal(true);
  const [categoryOptions, setCategoryOptions] = createSignal<CategoryOption[]>(
    [],
  );

  const [avatar, setAvatar] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [category, setCategory] = createSignal(0);
  const [distance, setDistance] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [emailDraft, setEmailDraft] = createSignal("");
  const [emailModalOpen, setEmailModalOpen] = createSignal(false);
  const [emailSaving, setEmailSaving] = createSignal(false);
  const [passwordResetSending, setPasswordResetSending] = createSignal(false);

  const [profileState, setProfileState] = createSignal<SaveState>(null);
  const [emailState, setEmailState] = createSignal<SaveState>(null);
  const [passwordState, setPasswordState] = createSignal<SaveState>(null);
  const [pros, setPros] = createSignal<AvailablePro[]>([]);
  const [selectedProIds, setSelectedProIds] = createSignal<string[]>([]);
  const [proAccessLoading, setProAccessLoading] = createSignal(false);
  const [proAccessState, setProAccessState] = createSignal<SaveState>(null);

  createEffect(() => {
    const currentUser = user();
    let cancelled = false;

    const loadProfile = async () => {
      if (!currentUser) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) {
        setEmail(currentUser.email ?? "");
        setEmailDraft(currentUser.email ?? "");
      }

      if (!cancelled && !hasLoadedProfileOnce) {
        setLoading(true);
      }

      try {
        const [
          { data: profileData, error: profileError },
          { data: categories, error: categoryError },
          availablePros,
          assignedPros,
        ] = await Promise.all([
          supabase
            .from("user_profiles")
            .select(
              "user_name, avatar_url, preferred_distance_unit, category(id, name)",
            )
            .eq("id", currentUser.id)
            .maybeSingle<ProfileData>(),
          supabase.from("category").select("id, code, name").order("id"),
          fetchAvailablePros(),
          fetchAssignedProIds(),
        ]);

        if (cancelled) return;

        if (profileError) {
          setProfileState({
            type: "error",
            message: `t("profile.state.profileError")}: ${profileError.message}`,
          });
          return;
        }

        if (categoryError) {
          setProfileState({
            type: "error",
            message: `t("profile.state.categoryError")}: ${categoryError.message}`,
          });
          return;
        }

        setCategoryOptions(categories ?? []);
        setPros(availablePros);
        setSelectedProIds(assignedPros);
        setUsername(profileData?.user_name ?? "");
        setAvatar(profileData?.avatar_url ?? "");
        setCategory(profileData?.category?.id ?? 0);
        setDistance(profileData?.preferred_distance_unit ?? "");
      } catch (error) {
        if (!cancelled) {
          setProfileState({
            type: "error",
            message:
              t("profile.state.profileError") +
              `: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      } finally {
        if (!cancelled) {
          hasLoadedProfileOnce = true;
          setLoading(false);
        }
      }
    };

    void loadProfile();
    onCleanup(() => {
      cancelled = true;
    });
  });

  const saveProfile = async () => {
    const currentUser = user();
    if (!currentUser) return;

    setProfileState(null);
    if (!username().trim()) {
      setProfileState({
        type: "error",
        message: t("profile.state.usernameRequired"),
      });
      return;
    }

    if (!category()) {
      setProfileState({
        type: "error",
        message: t("profile.state.categoryRequired"),
      });
      return;
    }

    if (!distance()) {
      setProfileState({
        type: "error",
        message: t("profile.state.distanceRequired"),
      });
      return;
    }

    const { error } = await supabase.from("user_profiles").upsert({
      id: currentUser.id,
      email: currentUser.email ?? email(),
      user_name: username().trim(),
      avatar_url: avatar().trim() || null,
      category_id: category(),
      preferred_distance_unit: normalizeDistanceUnit(distance()),
    });

    if (error) {
      setProfileState({
        type: "error",
        message: `t("profile.state.saveError")}: ${error.message}`,
      });
      return;
    }

    setProfileState({
      type: "success",
      message: t("profile.state.saveSuccess"),
    });
    await refreshProfile();
  };

  const saveEmail = async () => {
    const currentUser = user();
    if (!currentUser) return;

    setEmailState(null);

    const nextEmail = emailDraft().trim();
    if (!nextEmail) {
      setEmailState({
        type: "error",
        message: t("profile.state.emailRequired"),
      });
      return;
    }

    setEmailSaving(true);
    const { data, error } = await supabase.auth.updateUser({
      email: nextEmail,
    });

    if (error) {
      setEmailSaving(false);
      setEmailState({ type: "error", message: error.message });
      return;
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({ email: nextEmail })
      .eq("id", currentUser.id);

    if (profileError) {
      setEmailSaving(false);
      setEmailState({
        type: "error",
        message: `t("profile.state.emailSavingError")}: ${profileError.message}`,
      });
      return;
    }

    const emailChangeSent = Boolean(data.user?.email_change_sent_at);
    setEmailState({
      type: "success",
      message: emailChangeSent
        ? t("profile.state.emailSavingMessage")
        : t("profile.state.emailSavingMessageSuccess"),
    });
    await refreshProfile();
    setEmail(nextEmail);
    setEmailDraft(nextEmail);
    setEmailSaving(false);
    setEmailModalOpen(false);
  };

  const sendPasswordResetLink = async () => {
    if (passwordResetSending()) return;
    setPasswordState(null);

    const targetEmail = email().trim() || user()?.email?.trim() || "";
    if (!targetEmail) {
      setPasswordState({
        type: "error",
        message: t("profile.state.emailNotFound"),
      });
      return;
    }

    setPasswordResetSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPasswordResetSending(false);

    if (error) {
      setPasswordState({ type: "error", message: error.message });
      return;
    }

    setPasswordState({
      type: "success",
      message: `${t("profile.state.passwordSucccess1")}${targetEmail}. ${t("profile.state.passwordSucccess2")}`,
    });
  };

  const toggleProAccess = async (proUserId: string, enabled: boolean) => {
    setProAccessState(null);
    setProAccessLoading(true);

    if (
      enabled &&
      !selectedProIds().includes(proUserId) &&
      selectedProIds().length >= 2
    ) {
      setProAccessState({
        type: "error",
        message: t("profile.state.proAccess.error"),
      });
      setProAccessLoading(false);
      return;
    }

    const errorMessage = enabled
      ? await grantProAccess(proUserId)
      : await revokeProAccess(proUserId);

    if (errorMessage) {
      setProAccessState({
        type: "error",
        message: errorMessage,
      });
      setProAccessLoading(false);
      return;
    }

    const assignedPros = await fetchAssignedProIds();
    setSelectedProIds(assignedPros);
    setProAccessState({
      type: "success",
      message: t("profile.state.proAccess.success"),
    });
    setProAccessLoading(false);
  };

  return (
    <div class='mx-auto w-full max-w-4xl space-y-6'>
      <div class='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
        <h1 class='font-rubik text-3xl font-semibold tracking-tight text-slate-800'>
          {t("profile.title")}
        </h1>
        <p class='mt-2 font-grotesk text-sm text-slate-500'>
          {t("profile.description")}
        </p>
      </div>

      <Show when={!loading()} fallback={<div>Loading profile...</div>}>
        <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            {t("profile.publicProfile")}
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            {t("profile.publicProfileDescription")}
          </p>

          <div class='mt-4 space-y-4'>
            <label class='block'>
              <span class='mb-1 block text-sm font-medium text-slate-700'>
                {t("profile.username")}
              </span>
              <input
                type='text'
                value={username()}
                onInput={(e) => setUsername(e.currentTarget.value)}
                class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
                placeholder='Your username'
                required
              />
            </label>

            <label class='block'>
              <span class='mb-1 block text-sm font-medium text-slate-700'>
                Avatar URL
              </span>
              <input
                type='url'
                value={avatar()}
                onInput={(e) => setAvatar(e.currentTarget.value)}
                class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
                placeholder='https://...'
              />
            </label>

            <div class='grid gap-4 sm:grid-cols-2'>
              <label class='block'>
                <span class='mb-1 block text-sm font-medium text-slate-700'>
                  {t("profile.category")}
                </span>
                <select
                  value={category()}
                  onChange={(e) => setCategory(Number(e.currentTarget.value))}
                  class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800'
                  required
                >
                  <option value=''>Select category</option>
                  {categoryOptions().map((option) => (
                    <option value={option.id}>
                      {t(`categories.${option.code}`, {
                        defaultValue: option.name,
                      })}
                    </option>
                  ))}
                </select>
              </label>

              <label class='block'>
                <span class='mb-1 block text-sm font-medium text-slate-700'>
                  {t("profile.distanceUnit")}
                </span>
                <select
                  value={distance()}
                  onChange={(e) => setDistance(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800'
                  required
                >
                  <option value=''>{t("profile.selectUnit")}</option>
                  {distanceUnitOptions.map((option) => (
                    <option value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <Show when={profileState()}>
              {(state) => (
                <p
                  class={`rounded-md px-3 py-2 text-sm ${
                    state().type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {state().message}
                </p>
              )}
            </Show>

            <button
              type='button'
              onClick={saveProfile}
              class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
            >
              {t("profile.saveProfile")}
            </button>
          </div>
        </div>

        <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            {t("profile.proAccess")}
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            {t("profile.proAccessDescription")}
          </p>

          <Show when={proAccessState()}>
            {(state) => (
              <p
                class={`mt-4 rounded-md px-3 py-2 text-sm ${
                  state().type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {state().message}
              </p>
            )}
          </Show>

          <div class='mt-4 space-y-3'>
            {pros().map((pro) => {
              const enabled = selectedProIds().includes(pro.id);
              const disableEnable = !enabled && selectedProIds().length >= 2;

              return (
                <div class='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <div>
                    <p class='font-medium text-slate-800'>
                      {pro.user_name || pro.email || "Unnamed pro"}
                    </p>
                    <p class='text-sm text-slate-500'>
                      {pro.email ?? "No email"}
                    </p>
                  </div>
                  <button
                    type='button'
                    disabled={proAccessLoading() || disableEnable}
                    onClick={() => void toggleProAccess(pro.id, !enabled)}
                    class={`inline-flex rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                      enabled
                        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        : "border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100"
                    }`}
                  >
                    {enabled
                      ? t("profile.removeProAccess")
                      : t("profile.allowProAccess")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>Email</h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            {t("profile.emailDescription")}
          </p>
          <div class='mt-4 space-y-4'>
            <p class='rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700'>
              {t("profile.currentEmail")}: {email() || t("profile.notsetEmail")}
            </p>

            <Show when={emailState()}>
              {(state) => (
                <p
                  class={`rounded-md px-3 py-2 text-sm ${
                    state().type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {state().message}
                </p>
              )}
            </Show>

            <button
              type='button'
              onClick={() => {
                setEmailDraft(email());
                setEmailState(null);
                setEmailModalOpen(true);
              }}
              class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
            >
              {t("profile.changeEmail")}
            </button>
          </div>
        </div>

        <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            {t("profile.password")}
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            {t("profile.passwordDescription")}
          </p>
          <div class='mt-4 space-y-4'>
            <Show when={passwordState()}>
              {(state) => (
                <p
                  class={`rounded-md px-3 py-2 text-sm ${
                    state().type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {state().message}
                </p>
              )}
            </Show>

            <button
              type='button'
              onClick={sendPasswordResetLink}
              disabled={passwordResetSending()}
              class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
            >
              {passwordResetSending() ? "Sending..." : "Reset Password"}
            </button>
          </div>
        </div>
      </Show>

      <ChangeEmailModal
        open={emailModalOpen}
        emailDraft={emailDraft()}
        saving={emailSaving()}
        onEmailInput={setEmailDraft}
        onCancel={() => setEmailModalOpen(false)}
        onSave={saveEmail}
      />
    </div>
  );
};

export default Profile;
