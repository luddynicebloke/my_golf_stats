import { createSignal } from "solid-js";

type Status = "idle" | "success" | "error";

export function useBlurSave<T>(
  getValue: () => T,
  save: (value: T) => Promise<unknown>,
) {
  const [status, setStatus] = createSignal<Status>("idle");
  const [loading, setLoading] = createSignal(false);
  const [originalValue, setOriginalValue] = createSignal<T>(getValue());

  let timeOutId: number | undefined;

  const resetStatus = () => {
    clearTimeout(timeOutId);
    timeOutId = window.setTimeout(() => {
      setStatus("idle");
    }, 500);
  };

  const handleFocus = () => {
    setOriginalValue(() => getValue());
  };

  const handleBlur = async () => {
    let newValue = getValue();

    if (newValue === originalValue()) return;

    setLoading(true);
    const result = await save(newValue);

    setLoading(false);

    if (!result || (result as any).error) {
      setStatus("error");
    } else {
      setStatus("success");
      setOriginalValue(() => newValue);
    }
    resetStatus();
  };

  const stateClasses = () => {
    switch (status()) {
      case "success":
        return "bg-green-100 border-green-500 text-green-700  text-center";
      case "error":
        return "bg-red-100 border-red-500 text-red-700 text-center";
      default:
        return "border rounded-md p-1 text-center";
    }
  };
  return {
    status,
    loading,
    handleFocus,
    handleBlur,
    stateClasses,
  };
}
