import { JSX, createMemo, splitProps } from "solid-js";

import { InputLabel } from "./InputLabel";
import { InputError } from "./InputError";

import clsx from "clsx";

type TextInputProps = {
  ref: (element: HTMLInputElement) => void;
  type: "text" | "email" | "time" | "password" | "url" | "number" | "date";
  name: string;
  value: string | number | undefined;
  disabled?: boolean;
  onInput: JSX.EventHandler<HTMLInputElement, InputEvent>;
  onChange: JSX.EventHandler<HTMLInputElement, Event>;
  onBlur: JSX.EventHandler<HTMLInputElement, FocusEvent>;
  placeholder?: string;
  required?: boolean;
  class?: string;
  label?: string;
  error?: string;
  maxLength?: number;
  padding?: "none";
};

const TextInput = (props: TextInputProps) => {
  // split the props into local and passthrough
  const [local, inputProps] = splitProps(props, [
    "label",
    "error",
    "class",
    "padding",
    "value",
  ]);

  const getValue = createMemo<string | number | undefined>((prevValue) => {
    const val = props.value;
    if (val === undefined || Number.isNaN(val)) {
      return prevValue;
    }
    return val;
  });

  return (
    <div class={clsx(!props.padding && "", props.class)}>
      <InputLabel
        name={props.name}
        label={props.label}
        required={props.required}
      />

      <input
        {...inputProps}
        class={clsx(
          "input__field",
          props.error ? "border-red-600/50 dark:border-red-400/50" : "",
        )}
        id={props.name}
        value={getValue()}
      />
      <InputError name={props.name} error={props.error} />
    </div>
  );
};

export default TextInput;
