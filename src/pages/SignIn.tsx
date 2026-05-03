import { createForm, required, reset } from "@modular-forms/solid";
import { A, useNavigate } from "@solidjs/router";
import { createEffect, createMemo, createSignal } from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";

import TextInput from "../components/forms/TextInput";
import LogoSG from "../assets/logo.png";
import { supabase } from "../supabase/client";
import { useAuth } from "../context/AuthProvider";

type LoginFormProps = {
  email: string;
  password: string;
};

export default function SignIn() {
  const auth = useAuth();
  const [loading, setLoading] = createSignal(false);
  const [waitingForAuth, setWaitingForAuth] = createSignal(false);
  const [submitError, setSubmitError] = createSignal("");
  const [loginForm, { Form, Field }] = createForm<LoginFormProps>();
  const [t] = useTransContext();
  const navigate = useNavigate();
  const signingIn = createMemo(
    () => loading() || waitingForAuth() || auth.loading(),
  );

  createEffect(() => {
    if (!auth.initialized() || auth.loading() || !auth.user()) {
      return;
    }

    navigate("/dashboard", { replace: true });
  });

  const handleFormSubmit = async (values: LoginFormProps) => {
    setSubmitError("");
    setWaitingForAuth(false);
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setSubmitError(error.message);
        return;
      }

      reset(loginForm);
      setWaitingForAuth(true);
    } catch (error) {
      setSubmitError(t("errors.unexpected"));
      console.error("Unexpected error:", error);
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
            {t("signin.title")}
          </p>
          <h1 class='mt-2 font-rubik text-3xl font-semibold leading-tight sm:text-4xl'>
            {t("signin.login")}
          </h1>
          <p class='mt-3 max-w-sm font-grotesk text-sm text-slate-300 sm:text-base'>
            {t("signin.description")}
          </p>
        </div>

        <div class='p-6 sm:p-8 lg:p-10'>
          <h2 class='font-rubik text-2xl font-semibold text-slate-800'>
            {t("signin.signIn")}
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            {t("signin.signInDescription")}
          </p>

          <div class='mt-4 min-h-6'>
            {submitError() ? (
              <p class='rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                {submitError()}
              </p>
            ) : null}
          </div>

          <div class='mt-3 [&_label]:text-slate-700 dark:[&_label]:text-slate-700 [&_input]:bg-white [&_input]:text-slate-800 [&_input]:placeholder:text-slate-400 dark:[&_input]:bg-white dark:[&_input]:text-slate-800 dark:[&_input]:placeholder:text-slate-400'>
            <Form
              onSubmit={(values) => handleFormSubmit(values)}
              class='space-y-4'
            >
              <Field name='email' validate={[required(t("forms.emailRequired"))]}>
                {(field, props) => (
                  <TextInput
                    {...props}
                    type='email'
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    required
                    label={t("forms.email")}
                    placeholder={t("forms.emailPlaceholder")}
                    class='min-h-30'
                  />
                )}
              </Field>
              <Field
                name='password'
                validate={[required(t("forms.passwordRequired"))]}
              >
                {(field, props) => (
                  <TextInput
                    {...props}
                    type='password'
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    required
                    label={t("forms.password")}
                    placeholder={t("signin.passwordPlaceholder")}
                    class='min-h-30'
                  />
                )}
              </Field>

              <button
                class='inline-flex w-full justify-center self-auto rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60'
                type='submit'
                disabled={signingIn()}
              >
                {signingIn() ? t("signin.signingIn") : t("signin.logInButton")}
              </button>
            </Form>
          </div>

          <div class='mt-5 flex flex-wrap gap-x-4 gap-y-2 font-grotesk text-sm'>
            <A class='text-cyan-700 hover:underline' href='/reset-password'>
              {t("signin.forgotPassword")}
            </A>
            <A
              class='text-slate-600 hover:text-slate-800 hover:underline'
              href='/register'
            >
              {t("signin.createAccount")}
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}
