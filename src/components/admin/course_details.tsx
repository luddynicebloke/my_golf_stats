import { Show } from "solid-js";
import { TCourse } from "../../lib/definitions";

import LoadingCss from "../LoadingCss";
import { A } from "@solidjs/router";

const Course_details = (props: { course: TCourse | undefined }) => {
  return (
    <Show
      when={props.course}
      fallback={
        <div>
          <LoadingCss />
        </div>
      }
    >
      <div class='p-4'>
        <h2 class='text-xl font-bold mb-4'>{props.course?.name}</h2>
        <p class='mb-2'>City: {props.course?.city}</p>
        <p class='mb-2'>Country: {props.course?.country}</p>

        <p class='mb-2'>
          Created At: {new Date(props.course!.created_at).toLocaleDateString()}
        </p>
        <A class='solid_A' href={`/import_scorecard/${props.course?.id}`}>
          Import scorecard
        </A>
      </div>
    </Show>
  );
};

export default Course_details;
