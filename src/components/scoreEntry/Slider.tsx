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
  valueSuffix?: string;
  marksSuffix?: string;

  id?: string;
  class?: string;
};

const Slider = (props: SliderProps) => {
  const id = () => props.id ?? "slider";
  const min = () => props.min ?? 1;
  const max = () => props.max ?? 600;
  const clamp = (value: number) => Math.min(max(), Math.max(min(), value));

  const handleInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (
    e,
  ) => {
    props.onChange(clamp(Number(e.currentTarget.value)));
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
            min={min()}
            max={max()}
            step={props.step ?? 1}
            value={props.value}
            onInput={handleInput}
            class='bg-white text-gray-700 p-3 w-24 rounded-md font-bold'
            aria-label={
              props.valueSuffix
                ? `${props.label ?? "Slider"} in ${props.valueSuffix}`
                : props.label
            }
          />
          {props.valueSuffix ? (
            <span class='ml-2 min-w-8 text-right text-sm font-medium text-slate-500'>
              {props.valueSuffix}
            </span>
          ) : null}
        </div>
        <input
          id={id()}
          type='range'
          value={props.value}
          step={props.step ?? 1}
          min={min()}
          max={max()}
          onInput={handleInput}
          class='w-full h-2 bg-gray-400 rounded-lg appearance-none cursor-pointer'
        />
        <span class='text-sm text-gray-800 text-body absolute start-0 -bottom-6'>
          {props.r1}
          {props.marksSuffix ?? ""}
        </span>
        <span class='text-sm text-gray-800 text-body absolute start-1/6 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6'>
          {props.r2}
          {props.marksSuffix ?? ""}
        </span>
        <span class='text-sm text-gray-800 text-body absolute start-2/6 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6'>
          {props.r3}
          {props.marksSuffix ?? ""}
        </span>
        <span class='text-sm text-gray-800 text-body absolute start-3/6 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6'>
          {props.r4}
          {props.marksSuffix ?? ""}
        </span>
        <span class='text-sm text-gray-800 text-body absolute start-4/6 -translate-x-1/2 rtl:translate-x-1/2 -bottom-6'>
          {props.r5}
          {props.marksSuffix ?? ""}
        </span>
        <span class='text-sm text-gray-800 text-body absolute start-5/6 -translate-x-1/1 rtl:translate-x-1/2 -bottom-6'>
          {props.r6}
          {props.marksSuffix ?? ""}
        </span>
        <span class='text-sm text-gray-800 text-body absolute end-0 -bottom-6'>
          {props.r7}
          {props.marksSuffix ?? ""}+
        </span>
      </div>
    </>
  );
};

export default Slider;
