import { createForm, required, reset } from "@modular-forms/solid";
import { A, useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";

import TextInput from "../components/forms/TextInput";
import LogoSG from "../assets/logo.png";
import { supabase } from "../supabase/client";

type LoginFormProps = {
  email: string;
  password: string;
};

export default function SignIn() {
  const [loading, setLoading] = createSignal(false);
  const [submitError, setSubmitError] = createSignal("");
  const [loginForm, { Form, Field }] = createForm<LoginFormProps>();
  const [t] = useTransContext();
  const navigate = useNavigate();

  const handleFormSubmit = async (values: LoginFormProps) => {
    setSubmitError("");
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
      navigate("/dashboard");
    } catch (error) {
      setSubmitError("An unexpected error occurred. Please try again.");
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class='min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8'>
      <div class='mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2'>
        <div class='bg-linear-to-br from-cyan-950 via-slate-900 to-emerald-950 p-8 text-white sm:p-10'>
          <img class='h-20 w-auto' src={LogoSG} alt='SG Calculater Logo' />
          <p class='mt-6 font-grotesk text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300'>
            Welcome Back
          </p>
          <h1 class='mt-2 font-rubik text-3xl font-semibold leading-tight sm:text-4xl'>
            Log in
          </h1>
          <p class='mt-3 max-w-sm font-grotesk text-sm text-slate-300 sm:text-base'>
            Sign in to view rounds, track strokes gained, and manage your golf
            profile.
          </p>
        </div>

        <div class='p-6 sm:p-8 lg:p-10'>
          <h2 class='font-rubik text-2xl font-semibold text-slate-800'>
            Sign In
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            Enter your email and password to continue.
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
              <Field name='email' validate={[required("Email is required")]}>
                {(field, props) => (
                  <TextInput
                    {...props}
                    type='email'
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    required
                    label='Email'
                    placeholder='you@example.com'
                    class='min-h-30'
                  />
                )}
              </Field>
              <Field
                name='password'
                validate={[required("Password is required")]}
              >
                {(field, props) => (
                  <TextInput
                    {...props}
                    type='password'
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    required
                    label='Password'
                    placeholder='Your password'
                    class='min-h-30'
                  />
                )}
              </Field>

              <button
                class='inline-flex w-full justify-center self-auto rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60'
                type='submit'
                disabled={loading()}
              >
                {loading() ? "Signing in..." : "Log in"}
              </button>
            </Form>
          </div>

          <div class='mt-5 flex flex-wrap gap-x-4 gap-y-2 font-grotesk text-sm'>
            <A class='text-cyan-700 hover:underline' href='/reset-password'>
              Forgot password?
            </A>
            <A
              class='text-slate-600 hover:text-slate-800 hover:underline'
              href='/register'
            >
              Create account
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}
