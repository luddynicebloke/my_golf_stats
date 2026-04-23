import { A, useNavigate } from "@solidjs/router";
import { Show, createSignal, onMount } from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";

import LogoSG from "../assets/logo.png";
import { supabase } from "../supabase/client";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [t] = useTransContext();

  const [email, setEmail] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [isRecoveryMode, setIsRecoveryMode] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [successMessage, setSuccessMessage] = createSignal("");

  const hasRecoveryToken = () => {
    const hash = window.location.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);

    const hasRecoveryType =
      hashParams.get("type") === "recovery" ||
      queryParams.get("type") === "recovery";

    const hasToken =
      Boolean(hashParams.get("access_token")) ||
      Boolean(hashParams.get("token_hash")) ||
      Boolean(hashParams.get("code")) ||
      Boolean(queryParams.get("access_token")) ||
      Boolean(queryParams.get("token_hash")) ||
      Boolean(queryParams.get("code"));

    return hasRecoveryType && hasToken;
  };

  onMount(async () => {
    if (hasRecoveryToken()) {
      setIsRecoveryMode(true);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });

    return () => authListener.subscription.unsubscribe();
  });

  const sendResetLink = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!email().trim()) {
      setErrorMessage(t("forms.emailRequired"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email().trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      t("resetPassword.resetLinkSent"),
    );
  };

  const updatePassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!newPassword()) {
      setErrorMessage(t("resetPassword.newPasswordRequired"));
      return;
    }
    if (newPassword().length < 6) {
      setErrorMessage(t("resetPassword.passwordLength"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword(),
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await supabase.auth.signOut({ scope: "local" });
      setSuccessMessage(t("resetPassword.updateSuccess"));
      setNewPassword("");
      navigate("/signin", { replace: true });
    } catch (_error) {
      setErrorMessage(t("resetPassword.updateError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class='min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8'>
      <div class='mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2'>
        <div class='bg-linear-to-br from-cyan-950 via-slate-900 to-emerald-950 p-8 text-white sm:p-10'>
          <img class='h-20 w-auto' src={LogoSG} alt={t("common.logoAlt")} />
          <p class='mt-6 font-grotesk text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300'>
            {t("resetPassword.eyebrow")}
          </p>
          <h1 class='mt-2 font-rubik text-3xl font-semibold leading-tight sm:text-4xl'>
            {t("resetPassword.title")}
          </h1>
          <p class='mt-3 max-w-sm font-grotesk text-sm text-slate-300 sm:text-base'>
            {t("resetPassword.description")}
          </p>
        </div>

        <div class='p-6 sm:p-8 lg:p-10'>
          <h2 class='font-rubik text-2xl font-semibold text-slate-800'>
            {isRecoveryMode()
              ? t("resetPassword.setNewPassword")
              : t("resetPassword.forgotPassword")}
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            {isRecoveryMode()
              ? t("resetPassword.newPasswordDescription")
              : t("resetPassword.emailDescription")}
          </p>

          <div class='mt-4 min-h-6 space-y-2'>
            <Show when={errorMessage()}>
              <p class='rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                {errorMessage()}
              </p>
            </Show>
            <Show when={successMessage()}>
              <p class='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>
                {successMessage()}
              </p>
            </Show>
          </div>

          <div class='mt-3 space-y-4'>
            <Show
              when={isRecoveryMode()}
              fallback={
                <>
                  <label class='block'>
                    <span class='mb-1 block text-sm font-medium text-slate-700'>
                      {t("forms.email")}
                    </span>
                    <input
                      type='email'
                      value={email()}
                      onInput={(e) => setEmail(e.currentTarget.value)}
                      class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
                      placeholder={t("forms.emailPlaceholder")}
                    />
                  </label>

                  <button
                    type='button'
                    onClick={sendResetLink}
                    disabled={loading()}
                    class='inline-flex w-full justify-center rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {loading()
                      ? t("resetPassword.sending")
                      : t("resetPassword.sendResetLink")}
                  </button>
                </>
              }
            >
              <label class='block'>
                <span class='mb-1 block text-sm font-medium text-slate-700'>
                  {t("resetPassword.newPassword")}
                </span>
                <input
                  type='password'
                  value={newPassword()}
                  onInput={(e) => setNewPassword(e.currentTarget.value)}
                  class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
                  placeholder={t("resetPassword.newPasswordPlaceholder")}
                />
              </label>

              <button
                type='button'
                onClick={updatePassword}
                disabled={loading()}
                class='inline-flex w-full justify-center rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {loading()
                  ? t("resetPassword.updating")
                  : t("resetPassword.updatePassword")}
              </button>
            </Show>
          </div>

          <div class='mt-5 font-grotesk text-sm'>
            <A
              class='text-slate-600 hover:text-slate-800 hover:underline'
              href='/signin'
            >
              {t("resetPassword.backToSignIn")}
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}
