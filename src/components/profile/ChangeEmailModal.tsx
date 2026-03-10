import { Show } from "solid-js";

type ChangeEmailModalProps = {
  open: () => boolean;
  emailDraft: string;
  saving: boolean;
  onEmailInput: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

const ChangeEmailModal = (props: ChangeEmailModalProps) => {
  return (
    <Show when={props.open()}>
      <div
        class='fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4'
        onClick={props.onCancel}
      >
        <div
          class='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl'
          onClick={(e) => e.stopPropagation()}
        >
          <h3 class='font-rubik text-xl font-semibold text-slate-800'>
            Change Email
          </h3>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            Enter your new email address.
          </p>
          <label class='mt-4 block'>
            <span class='mb-1 block text-sm font-medium text-slate-700'>
              New email
            </span>
            <input
              type='email'
              value={props.emailDraft}
              onInput={(e) => props.onEmailInput(e.currentTarget.value)}
              class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
              placeholder='you@example.com'
            />
          </label>
          <div class='mt-5 flex justify-end gap-2'>
            <button
              type='button'
              class='rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'
              onClick={props.onCancel}
              disabled={props.saving}
            >
              Cancel
            </button>
            <button
              type='button'
              class='rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60'
              onClick={props.onSave}
              disabled={props.saving}
            >
              {props.saving ? "Saving..." : "Save Email"}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default ChangeEmailModal;
