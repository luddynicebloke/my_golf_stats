import { Component, JSX, Show, onMount, onCleanup } from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";

type ModalProps = {
  open: boolean;
  title?: string;
  message?: string | JSX.Element;
  cancelText?: string;
  onClose: (confirmed: boolean) => void;
};

export default function ConfirmationModal(props: ModalProps) {
  // escape closes modal
  const [t] = useTransContext();
  return (
    <>
      <Show when={props.open}>
        <div
          class='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
          onClick={() => props.onClose(false)}
        >
          <div
            class='bg-white rounded-2xl shadow-xl w-full max-w-md p-6'
            onClick={(e) => e.stopPropagation()}
          >
            <h2 class='text-xl font-semibold mb-4'>
              {props.title ?? t("confirm")}
            </h2>

            <div class='text-gray-600 mb-6'>
              {props.message ?? t("areYouSure")}
            </div>

            <div class='flex justify-end gap-3'>
              <button
                type='button'
                class='px-4 py-2 rounded-xl border hover:bg-gray-100'
                onClick={() => props.onClose(false)}
              >
                {t("cancel")}
              </button>

              <button
                type='button'
                class='px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700'
                onClick={() => props.onClose(true)}
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
