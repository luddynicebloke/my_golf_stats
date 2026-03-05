import clsx from "clsx";
import { createMemo, For, JSX, Show, splitProps } from "solid-js";

import { InputError } from "./InputError";
import { InputLabel } from "./InputLabel";
import { AngleDownIcon } from "../../assets/AngleDownIcon";
import { PlayerCategories } from "../../lib/definitions";

type SelectProps = {
  ref: (element: HTMLSelectElement) => void;
  name: string;
  value: string | string[] | undefined;
  onInput: JSX.EventHandler<HTMLSelectElement, InputEvent>;
  onChange: JSX.EventHandler<HTMLSelectElement, Event>;
  onBlur: JSX.EventHandler<HTMLSelectElement, FocusEvent>;
  options: { label: string; value: string }[];
  multiple?: boolean;
  size?: string | number;
  placeholder?: string;
  required?: boolean;
  class?: string;
  label?: string;
  error?: string;
};

export function Select(props: SelectProps) {
  // split the props into local and passthrough
  const [local, selectProps] = splitProps(props, [
    "class",
    "value",
    "options",
    "label",
    "error",
  ]);

  // Create values list
  const getValues = createMemo(() => {
    const val = props.value;
    if (val === undefined || val === null) {
      return [];
    } else {
      return val;
    }
  });

  return (
    <div class={clsx("px-2 md:px-8", props.class)}>
      <InputLabel
        name={props.name}
        label={props.label}
        required={props.required}
      />
      <div class='relative '>
        <select
          {...selectProps}
          class={clsx(
            "input__field ",
            props.error ? "border-red-600/50 dark:border-red-400/50" : "",
          )}
        >
          <option value='' hidden selected>
            {props.placeholder}
          </option>
          <For each={props.options}>
            {({ label, value }) => (
              <option value={value} selected={getValues().includes(value)}>
                {label}
              </option>
            )}
          </For>
        </select>
      </div>
      <InputError name={props.name} error={props.error} />
    </div>
  );
}

export default Select;
