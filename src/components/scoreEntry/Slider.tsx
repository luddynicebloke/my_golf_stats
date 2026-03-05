import { JSX } from "solid-js";

type SliderProps = {
  value: number;
  onInput?: (next: number) => void;
  onChange: (next: number) => void;

  min?: number;
  max?: number;
  step?: number;

  r1: number;
  r2: number;
  r3: number;
  r4: number;
  r5: number;
  r6: number;
  r7: number;

  label?: string;
  showValue?: boolean;

  id?: string;
  class?: string;
};

const Slider = (props: SliderProps) => {
  const id = () => props.id ?? "slider";

  const handleInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (
    e,
  ) => {
    props.onChange(Number(e.currentTarget.value));
  };

  return (
    <>
      <div class=' text-gray-800 relative mb-10'>
        <div class='flex justify-between items-center'>
          <label for={id()} class=''>
            {props.label}
          </label>
          <input
            type='number'
            maxLength={3}
            min={props.min ?? 0.5}
            max={props.max ?? 600}
            step={props.step ?? 1}
            value={props.value}
            onInput={handleInput}
            class='bg-white text-gray-700 p-3 w-24 rounded-md font-bold'
          />
        </div>
        <input
          id={id()}
          type='range'
          value={props.value}
          step={props.step ?? 1}
          min={props.min ?? 0.5}
          max={props.max ?? 600}
          onInput={handleInput}
          class='w-full h-2 bg-gray-400 rounded-lg appearance-none cursor-pointer'
        />
        <span class='text-sm text-gray-800 text-body absolute start-0 -bottom-6'>
          {props.r1}
        </span>
        <span class='text-sm text-gray-800 text-body absolute start-1/6 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6'>
          {props.r2}
        </span>
        <span class='text-sm text-gray-800 text-body absolute start-2/6 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6'>
          {props.r3}
        </span>
        <span class='text-sm text-gray-800 text-body absolute start-3/6 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6'>
          {props.r4}
        </span>
        <span class='text-sm text-gray-800 text-body absolute start-4/6 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6'>
          {props.r5}
        </span>
        <span class='text-sm text-gray-800 text-body absolute start-5/6 -translate-x-1/1 rtl:translate-x-1/2 -bottom-6'>
          {props.r6}
        </span>
        <span class='text-sm text-gray-800 text-body absolute end-0 -bottom-6'>
          {props.r7}+
        </span>
      </div>
    </>
  );
};

export default Slider;
