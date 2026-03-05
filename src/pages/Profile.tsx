import { createEffect, createResource, createSignal, on, Show } from "solid-js";
import { supabase } from "../supabase/client";

import LogoSG from "../assets/logo.png";
import { useTransContext } from "@mbarzda/solid-i18next";
import TextInput from "../components/forms/TextInput";
import MessageModal from "../components/MessageModal";

import { PlayerCategories, User, CategoryOptions } from "../lib/definitions";

export type TProfile = {
  email: string;
  category: PlayerCategories;
};

import {
  createForm,
  getValue,
  setValue,
  required,
  reset,
  setValues,
} from "@modular-forms/solid";
import { A, useNavigate } from "@solidjs/router";

import { useAuth } from "../context/AuthProvider";
import Select from "../components/forms/Select";
import { use } from "i18next";

export default function Profile() {
  const [modelOpen, setModalOpen] = createSignal(false);
  const [modelMessage, setModalMessage] = createSignal("");
  const [profile, { Form, Field }] = createForm<User>();
  const [t] = useTransContext();
  const { user } = useAuth();

  const [currentUser] = createResource(user, async (user) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user data:", error);
      setModalOpen(true);
      return null;
    }

    return data;
  });

  createEffect(
    on(currentUser, (data) => {
      if (!data) return;

      setValues(profile, {
        email: data.email ?? "",
        category: data.category ?? "",
        avatar_url: data.avatar_url ?? "",
        distance: data.preferred_distance_unit ?? "",
      });
    }),
  );

  const handleFormSubmit = async (values: Partial<User>) => {
    setModalOpen(true);
    setModalMessage("Profile updated successfully!");
    const { error } = await supabase
      .from("user_profiles")
      .update({
        category: values.category,
        avatar_url: values.avatar_url,
        preferred_distance_unit: values.distance,
      })
      .eq("id", user()?.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      setModalMessage("Failed to update profile. Please try again.");
      setModalOpen(true);
    } else {
      setModalMessage("Profile updated successfully!");
      setModalOpen(true);
      reset(profile, {
        initialValues: {
          email: values.email ?? "",
          category: values.category ?? "",
          avatar_url: values.avatar_url ?? "",
          distance: values.distance ?? "",
        },
      });
    }
  };

  return (
    <>
      <MessageModal
        open={modelOpen()}
        title='Profile Updated'
        message={modelMessage()}
        onClose={() => setModalOpen(false)}
      />

      <div class='flex mx-auto min-h-full flex-col  px-6 py-12 lg:px-8'>
        <div class='mt-10 sm:mx-auto sm:w-full sm:max-w-sm'>
          <Show when={currentUser()} fallback={<div>Loading...</div>}>
            <Form
              onSubmit={(values) => handleFormSubmit(values)}
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
                    disabled
                    label='Email'
                    class='block w-full rounded-md px-3 py-1.5 text-base text-white  
                 placeholder:text-gray-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6'
                  />
                )}
              </Field>

              <Field
                name='avatar_url'
                validate={[required("Avatar is required")]}
              >
                {(field, props) => (
                  <TextInput
                    {...props}
                    type='text'
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    label='Avatar URL'
                    class='block w-full rounded-md px-3 py-1.5 text-base text-white  
                 placeholder:text-gray-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6'
                  />
                )}
              </Field>

              <Field
                name='category'
                validate={[required("Category is required")]}
              >
                {(field, props) => (
                  <Select
                    {...props}
                    options={CategoryOptions}
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    required
                    label='Category'
                    class='block w-full rounded-md px-3 py-1.5 text-base text-white  
                 placeholder:text-gray-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6'
                  />
                )}
              </Field>
              <Field
                name='distance'
                validate={[required("Category is required")]}
              >
                {(field, props) => (
                  <Select
                    {...props}
                    options={[
                      { label: "Metres", value: "Metres" },
                      { label: "Yards", value: "Yards" },
                    ]}
                    name={field.name}
                    value={field.value}
                    error={field.error}
                    label='Distance'
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
                  Update Profile
                </button>
              </div>
            </Form>
          </Show>
        </div>
      </div>
    </>
  );
}
