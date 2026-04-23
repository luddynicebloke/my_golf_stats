import { Show } from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";

type ChangePasswordModalProps = {
  open: () => boolean;
  password: string;
  confirmPassword: string;
  saving: boolean;
  errorMessage?: string;
  onPasswordInput: (value: string) => void;
  onConfirmPasswordInput: (value: string) => void;
  onCancel: () => void;
  onSave: () => Promise<void> | void;
};

const ChangePasswordModal = (props: ChangePasswordModalProps) => {
  const [t] = useTransContext();

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
            {t("profile.changePassword")}
          </h3>
          <p class='mt-1 font-grotesk text-sm text-slate-500'>
            {t("profile.changePasswordDescription")}
          </p>
          <label class='mt-4 block'>
            <span class='mb-1 block text-sm font-medium text-slate-700'>
              {t("resetPassword.newPassword")}
            </span>
            <input
              type='password'
              value={props.password}
              onInput={(e) => props.onPasswordInput(e.currentTarget.value)}
              class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
              placeholder={t("resetPassword.newPasswordPlaceholder")}
            />
          </label>
          <label class='mt-3 block'>
            <span class='mb-1 block text-sm font-medium text-slate-700'>
              {t("profile.confirmNewPassword")}
            </span>
            <input
              type='password'
              value={props.confirmPassword}
              onInput={(e) =>
                props.onConfirmPasswordInput(e.currentTarget.value)
              }
              class='w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400'
              placeholder={t("profile.repeatNewPassword")}
            />
          </label>
          <Show when={props.errorMessage}>
            <p class='mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
              {props.errorMessage}
            </p>
          </Show>
          <div class='mt-5 flex justify-end gap-2'>
            <button
              type='button'
              class='rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'
              onClick={props.onCancel}
              disabled={props.saving}
            >
              {t("common.cancel")}
            </button>
            <button
              type='button'
              class='rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-60'
              onClick={props.onSave}
              disabled={props.saving}
            >
              {props.saving ? t("common.saving") : t("profile.savePassword")}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default ChangePasswordModal;
