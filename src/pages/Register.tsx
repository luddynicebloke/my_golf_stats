import { createForm, required } from "@modular-forms/solid";
import { A, useNavigate } from "@solidjs/router";
import { createSignal, onMount } from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";

import LogoSG from "../assets/logo.png";
import TextInput from "../components/forms/TextInput";
import { distanceUnitOptions, normalizeDistanceUnit } from "../lib/distance";
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
  const [categoryOptions, setCategoryOptions] = createSignal<CategoryOption[]>(
    [],
  );
  const [t] = useTransContext();

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

  const handleRegister = async (values: RegisterFormProps) => {
    setSubmitError("");

    if (!values.username?.trim()) {
      setSubmitError(t("forms.usernameRequired"));
      return;
    }

    if (values.password !== values.confirmPassword) {
      setSubmitError(t("register.passwordMismatch"));
      return;
    }
    if (!category()) {
      setSubmitError(t("register.categoryRequired"));
      return;
    }
    if (!distanceUnit()) {
      setSubmitError(t("register.distanceUnitRequired"));
      return;
    }

    try {
      setLoading(true);
      const selectedCategory = categoryOptions().find(
        (option) => option.code === category(),
      );

      if (!selectedCategory) {
        setSubmitError(t("register.invalidCategory"));
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
      setSubmitError(t("errors.unexpected"));
      console.error("Unexpected register error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class='min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8'>
      <div class='mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2'>
        <div class='bg-linear-to-br from-cyan-950 via-slate-900 to-emerald-950 p-8 text-white sm:p-10'>
          <img class='h-20 w-auto' src={LogoSG} alt={t("common.logoAlt")} />
          <p class='mt-6 font-grotesk text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300'>
            {t("register.new")}
          </p>
          <h1 class='mt-2 font-rubik text-3xl font-semibold leading-tight sm:text-4xl'>
            {t("register.title")}
          </h1>
          <p class='mt-3 max-w-sm font-grotesk text-sm text-slate-300 sm:text-base'>
            {t("register.description")}
          </p>
        </div>

        <div class='p-6 sm:p-8 lg:p-10'>
          <h2 class='font-rubik text-2xl font-semibold text-slate-800'>
            {t("register.register")}
          </h2>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            {t("register.registerDescription")}
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
                validate={[required(t("forms.usernameRequired"))]}
              >
                {(field, props) => (
                  <TextInput
                    {...props}
                    type='text'
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    required
                    label={t("forms.username")}
                    placeholder={t("forms.usernamePlaceholder")}
                    class='min-h-[7.5rem]'
                  />
                )}
              </Field>

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
                    class='min-h-[7.5rem]'
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
                    placeholder={t("register.passwordPlaceholder")}
                    class='min-h-[7.5rem]'
                  />
                )}
              </Field>

              <Field
                name='confirmPassword'
                validate={[required(t("register.confirmPasswordRequired"))]}
              >
                {(field, props) => (
                  <TextInput
                    {...props}
                    type='password'
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    required
                    label={t("register.confirmPassword")}
                    placeholder={t("register.confirmPasswordPlaceholder")}
                    class='min-h-[7.5rem]'
                  />
                )}
              </Field>

              <label class='block'>
                <span class='mb-1 block text-sm font-medium text-slate-700'>
                  {t("register.avatarUrl")}
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
                    onChange={(e) => setCategory(e.currentTarget.value)}
                    class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800'
                    required
                  >
                    <option value='' disabled>
                      {t("register.selectCategory")}
                    </option>
                    {categoryOptions().map((option) => (
                      <option value={option.code}>
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
                    value={distanceUnit()}
                    onChange={(e) => setDistanceUnit(e.currentTarget.value)}
                    class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800'
                    required
                  >
                    <option value='' disabled>
                      {t("profile.selectUnit")}
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
                  onChange={(e) =>
                    setRequestProAccount(e.currentTarget.checked)
                  }
                  class='mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-200'
                />
                <span>
                  <span class='block font-semibold'>
                    {t("register.requestProAccount")}
                  </span>
                  <span class='mt-1 block text-emerald-800'>
                    {t("register.requestProAccountDescription")}
                  </span>
                </span>
              </label>

              <button
                class='inline-flex w-full justify-center self-auto rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60'
                type='submit'
                disabled={loading()}
              >
                {loading() ? t("register.creating") : t("register.createAccount")}
              </button>
            </Form>
          </div>

          <div class='mt-5 font-grotesk text-sm'>
            <A
              class='text-slate-600 hover:text-slate-800 hover:underline'
              href='/signin'
            >
              {t("register.logInButton")}
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}
