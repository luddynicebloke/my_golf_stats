import { Show, createEffect, createSignal } from "solid-js";
import { supabase } from "../supabase/client";
import { useAuth } from "../context/AuthProvider";

const categoryOptions = [
  "Pro M",
  "Am M",
  "Senior M",
  "Pro F",
  "Am F",
  "Senior F",
];

const distanceOptions = ["yards", "meters"];

type SaveState = {
  type: "success" | "error";
  message: string;
} | null;

const Profile = () => {
  const { user, refreshProfile } = useAuth();

  const [loading, setLoading] = createSignal(true);

  const [avatar, setAvatar] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [category, setCategory] = createSignal("Am M");
  const [distance, setDistance] = createSignal("yards");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");

  const [profileState, setProfileState] = createSignal<SaveState>(null);
  const [emailState, setEmailState] = createSignal<SaveState>(null);
  const [passwordState, setPasswordState] = createSignal<SaveState>(null);

  createEffect(async () => {
    const currentUser = user();
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setEmail(currentUser.email ?? "");

    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_name, avatar_url, category, preferred_distance_unit")
      .eq("id", currentUser.id)
      .single();

    if (error) {
      setProfileState({
        type: "error",
        message: `Failed to load profile: ${error.message}`,
      });
    } else if (data) {
      setUsername(data.user_name ?? "");
      setAvatar(data.avatar_url ?? "");
      setCategory(data.category ?? "Am M");
      setDistance(data.preferred_distance_unit ?? "yards");
    }

    setLoading(false);
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

    const { error } = await supabase
      .from("user_profiles")
      .update({
        user_name: username().trim(),
        avatar_url: avatar().trim() || null,
        category: category(),
        preferred_distance_unit: distance(),
      })
      .eq("id", currentUser.id);

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

    const nextEmail = email().trim();
    if (!nextEmail) {
      setEmailState({ type: "error", message: "Email is required." });
      return;
    }

    const { data, error } = await supabase.auth.updateUser({
      email: nextEmail,
    });

    if (error) {
      setEmailState({ type: "error", message: error.message });
      return;
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({ email: nextEmail })
      .eq("id", currentUser.id);

    if (profileError) {
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
  };

  const savePassword = async () => {
    setPasswordState(null);

    if (!password()) {
      setPasswordState({ type: "error", message: "Password is required." });
      return;
    }
    if (password().length < 6) {
      setPasswordState({
        type: "error",
        message: "Password must be at least 6 characters.",
      });
      return;
    }
    if (password() !== confirmPassword()) {
      setPasswordState({ type: "error", message: "Passwords do not match." });
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password(),
    });

    if (error) {
      setPasswordState({ type: "error", message: error.message });
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setPasswordState({
      type: "success",
      message: "Password updated successfully.",
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
                  onChange={(e) => setCategory(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800'
                >
                  {categoryOptions.map((option) => (
                    <option value={option}>{option}</option>
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
                  {distanceOptions.map((option) => (
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
            Save email changes separately.
          </p>
          <div class='mt-4 space-y-4'>
            <label class='block'>
              <span class='mb-1 block text-sm font-medium text-slate-700'>
                Email
              </span>
              <input
                type='email'
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
                placeholder='you@example.com'
              />
            </label>

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
              onClick={saveEmail}
              class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
            >
              Save Email
            </button>
          </div>
        </div>

        <div class='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
          <h2 class='font-rubik text-xl font-semibold text-slate-800'>
            Password
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            Save password changes separately.
          </p>
          <div class='mt-4 space-y-4'>
            <label class='block'>
              <span class='mb-1 block text-sm font-medium text-slate-700'>
                New password
              </span>
              <input
                type='password'
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
                placeholder='New password'
              />
            </label>

            <label class='block'>
              <span class='mb-1 block text-sm font-medium text-slate-700'>
                Confirm new password
              </span>
              <input
                type='password'
                value={confirmPassword()}
                onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
                placeholder='Repeat new password'
              />
            </label>

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
              onClick={savePassword}
              class='inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
            >
              Save Password
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default Profile;
