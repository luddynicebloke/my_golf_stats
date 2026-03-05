import clsx from "clsx";
import { Show } from "solid-js";

type InputLabelProps = {
  name: string;
  label?: string;
  required?: boolean;
  margin?: "none";
};

export function InputLabel(props: InputLabelProps) {
  return (
    <Show when={props.label}>
      <label
        for={props.name}
        class={clsx(
          "input__label dark:text-white/75 text-md mb-1 block font-medium",
          !props.margin && "mb-2"
        )}
      >
        {props.label}
        {props.required ? <span class='text-neutral-500 ml-1'>*</span> : null}
      </label>
    </Show>
  );
}
