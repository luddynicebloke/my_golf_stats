import { useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { supabase } from "../../supabase/client";

import { createForm, required } from "@modular-forms/solid";
import { useTransContext } from "@mbarzda/solid-i18next";
import TextInput from "../forms/TextInput";
import { TCourse } from "../../lib/definitions";

type NewCourseForm = {
  name: string;
  city: string;
  country: string;
};

const CourseNew = () => {
  const navigate = useNavigate();
  const [t] = useTransContext();
  const [submitError, setSubmitError] = createSignal("");

  // create the form using modularforms
  const [newCourse, { Form, Field }] = createForm<NewCourseForm>();

  const handleSave = async (values: Partial<TCourse>) => {
    setSubmitError("");

    const { data, error } = await supabase
      .from("courses")
      .insert({ name: values.name, city: values.city, country: values.country })
      .select()
      .single();

    if (error || !data?.id) {
      setSubmitError(error?.message || t("admin.courses.createError"));
      return;
    }

    navigate(`/admin/course_editor/${data.id}`);
  };
  return (
    <div class='mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm sm:p-6'>
      <div class='mb-3 min-h-6'>
        {submitError() ? (
          <p class='rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
            {submitError()}
          </p>
        ) : null}
      </div>
      <div class='[&_label]:text-slate-700 dark:[&_label]:text-slate-700 [&_input]:bg-white [&_input]:text-slate-800 [&_input]:placeholder:text-slate-400 dark:[&_input]:bg-white dark:[&_input]:text-slate-800 dark:[&_input]:placeholder:text-slate-400'>
        <Form onSubmit={(values) => handleSave(values)}>
          <div class='grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end'>
            <Field name='name' validate={required(t("admin.courses.nameRequired"))}>
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type='text'
                  label={t("admin.courses.name")}
                  required
                  placeholder={t("admin.courses.courseName")}
                  class='min-h-30'
                />
              )}
            </Field>
            <Field name='city' validate={required(t("admin.courses.cityRequired"))}>
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type='text'
                  label={t("admin.city")}
                  required
                  placeholder={t("admin.courses.cityName")}
                  class='min-h-[7.5rem]'
                />
              )}
            </Field>
            <Field
              name='country'
              validate={required(t("admin.courses.countryRequired"))}
            >
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type='text'
                  label={t("admin.country")}
                  required
                  placeholder={t("admin.country")}
                  class='min-h-[7.5rem]'
                />
              )}
            </Field>

            <button
              class='inline-flex self-auto rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 lg:mb-1'
              type='submit'
            >
              {t("admin.courses.create")}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default CourseNew;
