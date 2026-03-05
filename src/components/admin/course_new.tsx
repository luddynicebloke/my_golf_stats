import { useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { supabase } from "../../supabase/client";

import { createForm, required } from "@modular-forms/solid";
import TextInput from "../forms/TextInput";
import { TCourse } from "../../lib/definitions";

type NewCourseForm = {
  name: string;
  city: string;
  country: string;
};

const Course_new = () => {
  const navigate = useNavigate();

  // create the form using modularforms
  const [newCourse, { Form, Field }] = createForm<NewCourseForm>();

  const handleSave = async (values: Partial<TCourse>) => {
    const { data, error } = await supabase
      .from("courses")
      .insert({ name: values.name, city: values.city, country: values.country })
      .select()
      .single();

    console.log(error);
    console.log(data.id);

    navigate(`/course_editor/${data.id}`);
  };
  return (
    <div class='bg-neutral-700 shadow-xs rounded-xl border flex flex-col  mb-4 p-2'>
      <div class=' p-2 '>
        <Form onSubmit={(values) => handleSave(values)}>
          <div class='flex gap-2 items-center'>
            <Field name='name' validate={required("Enter a name")}>
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type='text'
                  label='Name'
                  required
                  placeholder='Course name'
                />
              )}
            </Field>
            <Field name='city' validate={required("Enter a city")}>
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type='text'
                  label='City'
                  required
                  placeholder='City name'
                />
              )}
            </Field>
            <Field name='country' validate={required("Enter a country")}>
              {(field, props) => (
                <TextInput
                  {...props}
                  value={field.value}
                  error={field.error}
                  type='text'
                  label='Country'
                  required
                  placeholder='Country'
                />
              )}
            </Field>

            <button class='mt-8 p-2 mb-2' type='submit'>
              Create
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Course_new;
