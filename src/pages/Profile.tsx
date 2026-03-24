import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { supabase } from "../supabase/client";
import { useAuth } from "../context/AuthProvider";
import ChangeEmailModal from "../components/profile/ChangeEmailModal";
import {
  distanceUnitOptions,
  normalizeDistanceUnit,
} from "../lib/distance";

type SaveState = {
  type: "success" | "error";
  message: string;
} | null;

type CategoryOption = {
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
        ] = await Promise.all([
          supabase
            .from("user_profiles")
            .select(
              "user_name, avatar_url, preferred_distance_unit, category(id, name)",
            )
            .eq("id", currentUser.id)
            .maybeSingle<ProfileData>(),
          supabase.from("category").select("id, name").order("id"),
        ]);

        if (cancelled) return;

        if (profileError) {
          setProfileState({
            type: "error",
            message: `Failed to load profile: ${profileError.message}`,
          });
          return;
        }

        if (categoryError) {
          setProfileState({
            type: "error",
            message: `Failed to load categories: ${categoryError.message}`,
          });
          return;
        }

        setCategoryOptions(categories ?? []);
        setUsername(profileData?.user_name ?? "");
        setAvatar(profileData?.avatar_url ?? "");
        setCategory(profileData?.category?.id ?? 0);
        setDistance(
          normalizeDistanceUnit(profileData?.preferred_distance_unit),
        );
      } catch (error) {
        if (!cancelled) {
          setProfileState({
            type: "error",
            message: "Failed to load profile. Please refresh and try again.",
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
        message: "Username is required.",
      });
      return;
    }

    if (!category()) {
      setProfileState({
        type: "error",
        message: "Category is required.",
      });
      return;
    }

    const { error } = await supabase
      .from("user_profiles")
      .upsert({
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
        message: `Profile not saved: ${error.message}`,
      });
      return;
    }

    setProfileState({
      type: "success",
      message: "Profile saved to database.",
    });
    await refreshProfile();
  };

  const saveEmail = async () => {
    const currentUser = user();
    if (!currentUser) return;

    setEmailState(null);

    const nextEmail = emailDraft().trim();
    if (!nextEmail) {
      setEmailState({ type: "error", message: "Email is required." });
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
        message: `Auth email updated, but profile row failed: ${profileError.message}`,
      });
      return;
    }

    const emailChangeSent = Boolean(data.user?.email_change_sent_at);
    setEmailState({
      type: "success",
      message: emailChangeSent
        ? "Email update submitted. Check your inbox to confirm the new address."
        : "Email saved successfully.",
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
        message: "No email found for this account.",
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
      message: `Reset link sent to ${targetEmail}. Check your inbox.`,
    });
  };

  return (
    <div class='mx-auto w-full max-w-4xl space-y-6'>
      <div class='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
        <h1 class='font-rubik text-3xl font-semibold tracking-tight text-slate-800'>
          Profile Settings
        </h1>
        <p class='mt-2 font-grotesk text-sm text-slate-500'>
          Manage your account details and save changes to your profile.
        </p>
      </div>

      <Show when={!loading()} fallback={<div>Loading profile...</div>}>
        <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            Public Profile
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            Update avatar, category, and preferred distance unit.
          </p>

          <div class='mt-4 space-y-4'>
            <label class='block'>
              <span class='mb-1 block text-sm font-medium text-slate-700'>
                Username
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
                  Category
                </span>
                <select
                  value={category()}
                  onChange={(e) => setCategory(Number(e.currentTarget.value))}
                  class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800'
                >
                  <option value=''>Select category</option>
                  {categoryOptions().map((option) => (
                    <option value={option.id}>{option.name}</option>
                  ))}
                </select>
              </label>

              <label class='block'>
                <span class='mb-1 block text-sm font-medium text-slate-700'>
                  Distance Unit
                </span>
                <select
                  value={distance()}
                  onChange={(e) => setDistance(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800'
                >
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
              Save Profile
            </button>
          </div>
        </div>

        <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>Email</h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            Change your account email in a separate modal.
          </p>
          <div class='mt-4 space-y-4'>
            <p class='rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700'>
              Current email: {email() || "Not set"}
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
              Change Email
            </button>
          </div>
        </div>

        <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            Password
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            A reset link will be sent to your account email address.
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
