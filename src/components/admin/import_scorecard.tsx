import { createResource, createSignal, For, Show } from "solid-js";
import { supabase } from "../../supabase/client";
import { A, useParams } from "@solidjs/router";
import { TTee } from "../../lib/definitions";

type NewTee = {
  color: string;
  course_rating: number;
  slope_rating: number;
  total_yardage: number;
  course_id: number;
};

const Import_scorecard = () => {
  const params = useParams();
  const [showError, setShowError] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  let addTeeColourInputRef: HTMLInputElement | undefined;

  // show hide form to add tee
  const [addTee, setAddTee] = createSignal(false);

  // get the new tee details
  const [form, setForm] = createSignal<NewTee>({
    course_id: Number(params.id) || 0,
    color: "",
    course_rating: 0,
    slope_rating: 0,
    total_yardage: 0,
  });

  // fetch the current tees, use mutate later to update the data locally
  const [tees, { mutate }] = createResource(params.id, async (id_t) => {
    const { data, error } = await supabase
      .from("tees")
      .select("*")
      .eq("course_id", id_t);

    if (error) throw error;
    return data;
  });

  const handleChange = (key: keyof TTee) => (e: Event) => {
    if (key === "color") {
      setForm({
        ...form(),
        [key]: (e.target as HTMLInputElement).value.toLowerCase(),
      });
    } else {
      setForm({ ...form(), [key]: (e.target as HTMLInputElement).value });
    }
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    // console.log(form());

    const { data, error } = await supabase
      .from("tees")
      .insert(form())
      .select()
      .single();
    if (error) throw error;

    // update the resource cache
    mutate((prev) => (prev ? [data, ...prev] : [data]));
    setForm({
      ...form(),
      color: "",
      slope_rating: 0,
      course_rating: 0,
      total_yardage: 0,
    });
    addTeeColourInputRef?.focus();
  };

  async function importScorecard(csvText: string) {
    const { error } = await supabase.rpc("import_scorecard_csv", {
      p_course_id: params.id,
      p_csv: csvText,
    });

    if (error) {
      setErrorMessage(error.message);
      setShowError(true);
      console.error(error);

      return;
    }

    alert("Scorecard imported successfully");
  }

  const handleFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const csvText = await file.text();

    await importScorecard(csvText);
    // console.log(csvText);
    //navigate("/admin", { replace: true }); // redirect to admin panel if course is deleted
  };

  return (
    <div class='mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8'>
      <div class='rounded-3xl border border-slate-200 bg-linear-to-r from-cyan-950 via-slate-900 to-emerald-950 px-6 py-8 text-slate-100 shadow-xl'>
        <p class='font-grotesk text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300'>
          Golf Stats Admin
        </p>
        <div class='mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div>
            <h1 class='font-rubik text-3xl font-semibold tracking-tight md:text-4xl'>
              Import Scorecard
            </h1>
            <p class='mt-2 max-w-2xl font-grotesk text-sm text-slate-300 md:text-base'>
              Upload a CSV scorecard and map distances to existing tee colors.
            </p>
          </div>
          <A
            href={`/admin/course_editor/${params.id}`}
            class='inline-flex w-max items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 font-grotesk text-sm font-semibold text-white transition hover:bg-white/20'
          >
            Return to Course Editor
          </A>
        </div>
      </div>

      <div class='mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm sm:p-6'>
        <h2 class='font-rubik text-xl font-semibold'>Current Tees</h2>
        <Show
          when={tees()}
          fallback={<p class='mt-3 font-grotesk text-slate-500'>Loading...</p>}
        >
          <div class='mt-4 flex flex-wrap gap-2'>
            <For each={tees()}>
              {(tee) => (
                <span class='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-grotesk text-sm font-semibold text-slate-700'>
                  {tee.color}
                </span>
              )}
            </For>
          </div>
        </Show>

        <div class='mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4'>
          <p class='font-grotesk text-sm text-amber-900'>
            Important: every tee color in the CSV must already exist in the list
            above. Add missing tees before importing.
          </p>
          <p class='font-grotesk text-sm text-amber-900'>
            Very Important: Load scorecard distances in metres!
          </p>
        </div>

        <div class='mt-5'>
          <div class='flex flex-wrap items-center gap-3'>
            <p class='font-grotesk text-sm text-slate-700'>
              Add a new tee before import?
            </p>
            <button
              onClick={() => setAddTee(!addTee())}
              class='inline-flex self-auto rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-100'
            >
              {!addTee() ? "Yes, add tee" : "Hide form"}
            </button>
          </div>

          <Show when={addTee()}>
            <form
              onSubmit={submit}
              class='mt-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2'
            >
              <label class='block'>
                <span class='mb-1 block font-grotesk text-sm font-medium text-slate-600'>
                  Tee color
                </span>
                <input
                  ref={(el) => (addTeeColourInputRef = el)}
                  required
                  placeholder='Required'
                  value={form().color}
                  onInput={handleChange("color")}
                  class='w-full rounded-md border border-slate-300 bg-white p-2'
                  type='text'
                />
              </label>
              <label class='block'>
                <span class='mb-1 block font-grotesk text-sm font-medium text-slate-600'>
                  Course rating
                </span>
                <input
                  placeholder='Optional'
                  value={form().course_rating!}
                  onInput={handleChange("course_rating")}
                  class='w-full rounded-md border border-slate-300 bg-white p-2'
                  type='number'
                />
              </label>
              <label class='block'>
                <span class='mb-1 block font-grotesk text-sm font-medium text-slate-600'>
                  Slope rating
                </span>
                <input
                  placeholder='Optional'
                  value={form().slope_rating!}
                  onInput={handleChange("slope_rating")}
                  class='w-full rounded-md border border-slate-300 bg-white p-2'
                  type='number'
                />
              </label>
              <label class='block'>
                <span class='mb-1 block font-grotesk text-sm font-medium text-slate-600'>
                  Total yardage
                </span>
                <input
                  placeholder='Optional'
                  value={form().total_yardage!}
                  onInput={handleChange("total_yardage")}
                  class='w-full rounded-md border border-slate-300 bg-white p-2'
                  type='number'
                />
              </label>
              <div class='sm:col-span-2'>
                <button
                  type='submit'
                  class='inline-flex self-auto rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100'
                >
                  Add Tee
                </button>
              </div>
            </form>
          </Show>
        </div>

        <div class='mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <h3 class='font-rubik text-base font-semibold text-slate-800'>
            CSV Format Rules
          </h3>
          <p class='mt-2 font-grotesk text-sm text-slate-600'>
            First row is the header: start with <code>hole_number,par</code>,
            then tee colors. Use commas only, no trailing spaces, and no
            trailing comma.
          </p>
          <pre class='mt-3 overflow-x-auto rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700'>
            {`hole_number,par,white,yellow,blue
1,4,400,365,320
2,5,520,495,462
3,3,180,165,136
.....`}
          </pre>
        </div>

        <div class='mt-6'>
          <input
            onClick={() => setShowError(false)}
            class='block w-full max-w-md rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-600
              file:mr-4 file:rounded-md file:border-0 file:bg-cyan-700 file:px-4 file:py-2 file:font-semibold file:text-white
              hover:file:cursor-pointer hover:file:bg-cyan-800'
            type='file'
            accept='.csv'
            onChange={handleFile}
          />
          <Show when={showError()}>
            <p class='mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 font-grotesk text-sm text-rose-700'>
              {errorMessage()}
            </p>
          </Show>
        </div>
      </div>
    </div>
  );
};
export default Import_scorecard;
