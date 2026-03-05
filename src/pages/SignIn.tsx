import {
  createForm,
  getValue,
  setValue,
  required,
  reset,
} from "@modular-forms/solid";
import { A, useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import TextInput from "../components/forms/TextInput";
import LogoSG from "../assets/logo.png";

type LoginFormProps = {
  email: string;
  password: string;
};

import { useTransContext } from "@mbarzda/solid-i18next";
import { supabase } from "../supabase/client";

export default function SignIn() {
  const [loading, setLoading] = createSignal(false);
  const [loginForm, { Form, Field }] = createForm<LoginFormProps>();
  const [t] = useTransContext();
  const navigate = useNavigate();

  const handelFormSubmit = async (values: LoginFormProps) => {
    console.log("Form Values:", values);
    // Handle sign-in logic here
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        console.error("Error signing in:", error.message);
      }
      navigate("/dashboard");
    } catch (error) {
      alert("An unexpected error occurred. Please try again.");
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
      reset(loginForm);
    }
    // For example, call your authentication API
    // After submission, you might want to reset the form
  };

  return (
    <div class='flex mx-auto min-h-full flex-col  px-6 py-12 lg:px-8'>
      <div class='sm:mx-auto sm:w-full sm:max-w-sm'>
        <img
          class='mx-auto h-40 w-auto'
          src={LogoSG}
          alt='SG Calculater Logo'
        />
        <h2 class='mt-10 text-center text-2xl/9 font-bold tracking-tight text-white'>
          {t("login-title")}
        </h2>
      </div>
      <div class='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'>
        <Form
          onSubmit={(values) => handelFormSubmit(values)}
          class='space-y-4 sm:space-y-6'
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
                class='block w-full rounded-md px-3 py-1.5 text-base text-white  
                 placeholder:text-gray-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6'
              />
            )}
          </Field>
          <Field name='password' validate={[required("Password is required")]}>
            {(field, props) => (
              <TextInput
                {...props}
                type='password'
                name={field.name}
                value={field.value}
                error={field.error}
                required
                label='Password'
                class='block w-full rounded-md px-3 py-1.5 text-base text-white  
                 placeholder:text-gray-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6'
              />
            )}
          </Field>
          <div class='px-2'>
            <button
              class='w-full m-auto justify-center items-center  '
              type='submit'
            >
              {t("login-signin")}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
