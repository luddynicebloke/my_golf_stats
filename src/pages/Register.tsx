import { createForm, required } from "@modular-forms/solid";
import { A, useNavigate } from "@solidjs/router";
import { createSignal, onMount } from "solid-js";

import LogoSG from "../assets/logo.png";
import TextInput from "../components/forms/TextInput";
import {
  distanceUnitOptions,
  normalizeDistanceUnit,
} from "../lib/distance";
import { supabase } from "../supabase/client";

type RegisterFormProps = {
  email: string;
  password: string;
  confirmPassword: string;
  avatar: string;
  distance: string;
  category: string;
  username: string;
};

type CategoryOption = {
  id: number;
  code: string;
  name: string;
};

export default function Register() {
  const [loading, setLoading] = createSignal(false);
  const [submitError, setSubmitError] = createSignal("");
  const [avatar, setAvatar] = createSignal("");
  const [category, setCategory] = createSignal("");
  const [distanceUnit, setDistanceUnit] = createSignal("");
  const [requestProAccount, setRequestProAccount] = createSignal(false);
  const [categoryOptions, setCategoryOptions] = createSignal<CategoryOption[]>([]);

  const navigate = useNavigate();
  const [, { Form, Field }] = createForm<RegisterFormProps>();

  onMount(() => {
    void supabase
      .from("category")
      .select("id, code, name")
      .order("id")
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load register categories:", error);
          return;
        }

        setCategoryOptions((data as CategoryOption[] | null) ?? []);
      });
  });

  const clearStoredSession = () => {
    localStorage.clear();
    sessionStorage.clear();
    setSubmitError("");
    window.location.reload();
  };

  const handleRegister = async (values: RegisterFormProps) => {
    setSubmitError("");

    if (!values.username?.trim()) {
      setSubmitError("Username is required.");
      return;
    }

    if (values.password !== values.confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }
    if (!category()) {
      setSubmitError("Please select a category.");
      return;
    }
    if (!distanceUnit()) {
      setSubmitError("Please select a distance unit.");
      return;
    }

    try {
      setLoading(true);
      const selectedCategory = categoryOptions().find(
        (option) => option.code === category(),
      );

      if (!selectedCategory) {
        setSubmitError("Selected category is invalid.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            user_name: values.username.trim(),
            avatar_url: avatar().trim() || null,
            category_code: selectedCategory.code,
            pro_account_requested: requestProAccount(),
            preferred_distance_unit: normalizeDistanceUnit(distanceUnit()),
          },
        },
      });

      if (error) {
        setSubmitError(error.message);
        return;
      }

      const userId = data.user?.id;
      if (userId) {
        const { error: profileError } = await supabase
          .from("user_profiles")
          .upsert(
            {
              id: userId,
              email: values.email.trim(),
              user_name: values.username.trim(),
              category_id: selectedCategory.id,
              preferred_distance_unit: normalizeDistanceUnit(distanceUnit()),
              avatar_url: avatar().trim() || null,
              role: "user",
            },
            { onConflict: "id" },
          );

        if (profileError) {
          console.error("Profile setup during register failed:", profileError);
        }

        if (requestProAccount()) {
          const { error: proRequestError } = await supabase
            .from("pro_account_requests")
            .upsert(
              {
                user_id: userId,
                email: values.email.trim(),
                user_name: values.username.trim(),
                status: "pending",
              },
              { onConflict: "user_id" },
            );

          if (proRequestError) {
            console.error("Pro account request failed:", proRequestError);
          }
        }
      }

      navigate("/signin");
    } catch (error) {
      setSubmitError("An unexpected error occurred. Please try again.");
      console.error("Unexpected register error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class='min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8'>
      <div class='mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2'>
        <div class='bg-linear-to-br from-cyan-950 via-slate-900 to-emerald-950 p-8 text-white sm:p-10'>
          <img class='h-20 w-auto' src={LogoSG} alt='SG Calculater Logo' />
          <p class='mt-6 font-grotesk text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300'>
            New Account
          </p>
          <h1 class='mt-2 font-rubik text-3xl font-semibold leading-tight sm:text-4xl'>
            Create Your Profile
          </h1>
          <p class='mt-3 max-w-sm font-grotesk text-sm text-slate-300 sm:text-base'>
            Set up your account to track rounds, scorecards, and strokes gained.
          </p>
        </div>

        <div class='p-6 sm:p-8 lg:p-10'>
          <h2 class='font-rubik text-2xl font-semibold text-slate-800'>
            Register
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            Fill in your details to create a user account.
          </p>

          <div class='mt-4 min-h-6'>
            {submitError() ? (
              <p class='rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                {submitError()}
              </p>
            ) : null}
          </div>

          <div class='mt-3 [&_label]:text-slate-700 dark:[&_label]:text-slate-700 [&_input]:bg-white [&_input]:text-slate-800 [&_input]:placeholder:text-slate-400 dark:[&_input]:bg-white dark:[&_input]:text-slate-800 dark:[&_input]:placeholder:text-slate-400'>
            <Form onSubmit={handleRegister} class='space-y-4'>
              <Field
                name='username'
                validate={[required("Username is required")]}
              >
                {(field, props) => (
                  <TextInput
                    {...props}
                    type='text'
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    required
                    label='Username'
                    placeholder='Your username'
                    class='min-h-[7.5rem]'
                  />
                )}
              </Field>

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
                    class='min-h-[7.5rem]'
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
                    placeholder='Create password'
                    class='min-h-[7.5rem]'
                  />
                )}
              </Field>

              <Field
                name='confirmPassword'
                validate={[required("Please confirm your password")]}
              >
                {(field, props) => (
                  <TextInput
                    {...props}
                    type='password'
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    required
                    label='Confirm Password'
                    placeholder='Repeat password'
                    class='min-h-[7.5rem]'
                  />
                )}
              </Field>

              <label class='block'>
                <span class='mb-1 block text-sm font-medium text-slate-700'>
                  Avatar URL (optional)
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
                    required
                  >
                    <option value='' disabled>
                      Select category
                    </option>
                    {categoryOptions().map((option) => (
                      <option value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label class='block'>
                  <span class='mb-1 block text-sm font-medium text-slate-700'>
                    Distance Unit
                  </span>
                  <select
                    value={distanceUnit()}
                    onChange={(e) => setDistanceUnit(e.currentTarget.value)}
                    class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800'
                    required
                  >
                    <option value='' disabled>
                      Select distance unit
                    </option>
                    {distanceUnitOptions.map((option) => (
                      <option value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label class='flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900'>
                <input
                  type='checkbox'
                  checked={requestProAccount()}
                  onChange={(e) => setRequestProAccount(e.currentTarget.checked)}
                  class='mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-200'
                />
                <span>
                  <span class='block font-semibold'>Request a pro account</span>
                  <span class='mt-1 block text-emerald-800'>
                    Your account will be created as a standard user first. Clive
                    will review the request and approve pro access.
                  </span>
                </span>
              </label>

              <button
                class='inline-flex w-full justify-center self-auto rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60'
                type='submit'
                disabled={loading()}
              >
                {loading() ? "Creating account..." : "Create account"}
              </button>
            </Form>
          </div>

          <div class='mt-5 font-grotesk text-sm'>
            <button
              type='button'
              onClick={clearStoredSession}
              class='mb-3 inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'
            >
              Start fresh on this device
            </button>
          </div>

          <div class='font-grotesk text-sm'>
            <A
              class='text-slate-600 hover:text-slate-800 hover:underline'
              href='/signin'
            >
              Already have an account? Sign in
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}
