import { A } from "@solidjs/router";
import { useTransContext } from "@mbarzda/solid-i18next";

export default function NotFound() {
  const [t] = useTransContext();

  return (
    <div class='mt-25 mx-auto flex h-screen flex-col items-center align-center gap-4 text-center'>
      <h1 class='text-9xl font-bold text-blue-700/80 '>404</h1>
      <p class='text-4xl font-semibold'>{t("notFound.title")}</p>
      <p>
        {t("notFound.description")}
      </p>
      <A
        class='bg-blue-700/80 text-gray-100 px-4 py-3 rounded-md'
        href='/dashboard'
      >
        {t("notFound.backToDashboard")}
      </A>
    </div>
  );
}
