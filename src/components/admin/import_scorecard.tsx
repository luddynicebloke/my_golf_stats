import { createResource, createSignal, For, Show } from "solid-js";
import { supabase } from "../../supabase/client";
import { A, useNavigate, useParams } from "@solidjs/router";
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
  const navigate = useNavigate();

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
  const [tees, { mutate, refetch }] = createResource(
    params.id,
    async (id_t) => {
      const { data, error } = await supabase
        .from("tees")
        .select("*")
        .eq("course_id", id_t);

      if (error) throw error;
      return data;
    },
  );

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
    <div class='container mx-auto width-1/2 flex flex-col gap-5 justify-center items-center'>
      <A class='solid_A' href={`/course_editor/${params.id}`}>
        Return to course details
      </A>
      <h1 class='text-3xl'>Current tees</h1>
      <Show when={tees()} fallback={<div>Loading</div>}>
        <div class='grid grid-flow-col gap-4'>
          <For each={tees()}>
            {(tee) => <span class='text-2xl'>{tee.color}</span>}
          </For>
        </div>
      </Show>
      <section>
        <p>
          IMPORTANT - if the tee color(s) (description) that will be imported
          doesn't exist in the above list above then it must be created first.
        </p>
        <div class='flex my-5 gap-5'>
          <p>Do you want to add a new tee? </p>
          <button onclick={() => setAddTee(!addTee())} class='px-2 py-1'>
            {!addTee() ? "Yes" : "No"}
          </button>
          {!addTee() ? (
            ""
          ) : (
            <>
              <form onSubmit={submit} class='flex flex-col'>
                <label>Tee color</label>
                <input
                  ref={(el) => (addTeeColourInputRef = el)}
                  required
                  placeholder={"Required"}
                  value={form().color}
                  onInput={handleChange("color")}
                  class='border rounded-md p-2 mb-4'
                  type='text'
                />
                <label>Course rating</label>
                <input
                  placeholder={"Optional"}
                  value={form().course_rating!}
                  onInput={handleChange("course_rating")}
                  class='border rounded-md p-2 mb-4'
                  type='number'
                />
                <label>Slope rating</label>
                <input
                  placeholder={"Optional"}
                  value={form().slope_rating!}
                  onInput={handleChange("slope_rating")}
                  class='border rounded-md p-2 mb-4'
                  type='number'
                />
                <label>Total yardage</label>
                <input
                  placeholder={"Optional"}
                  value={form().total_yardage!}
                  onInput={handleChange("total_yardage")}
                  class='border rounded-md p-2 mb-6'
                  type='number'
                />
                <button type='submit' class='px-2 py-1'>
                  Add
                </button>
              </form>
            </>
          )}
        </div>
      </section>
      <p>
        The format below must be adhered to for the scorecard import to work.
        The first line contains the header. Start with hole_number, par and then
        the tee colours. No spaces, even at the end of the line and use commas.
        "hole_number" and "par" must be spelt exactly like this. NB there is no
        comma at the end of a line
      </p>
      <p>
        hole_number,par,white,yellow,blue
        <br />
        1,4,400,365,320
        <br />
        2,5,520,495,462
        <br />
        3,3,180,165,136
      </p>
      <input
        onclick={() => setShowError(false)}
        class='text-md text-stone-500 mt-5
                file:mr-5 file:py-1 file:px-3 file:font-medium file:text-xl file:bg-emerald-800
                file:text-white file:rounded-md hover:file:cursor-pointer hover:file:bg-blue-50
                hover:file:text-blue-700'
        type='file'
        accept='.csv'
        onChange={handleFile}
      />
      {showError() ? errorMessage() : ""}
    </div>
  );
};
export default Import_scorecard;
