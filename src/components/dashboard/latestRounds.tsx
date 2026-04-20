import { useTransContext } from "@mbarzda/solid-i18next";

import { TLatestRound } from "../../lib/definitions";

export const LatestRounds = (props: { recent: TLatestRound[] }) => {
  const [t] = useTransContext();

  return (
    <div class='w-full rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm sm:p-6'>
      <h2 class='mb-4 font-rubik text-lg font-semibold sm:text-xl'>
        {t("dashboard.latestRounds.title")}
      </h2>

      <div class='w-full overflow-x-auto'>
        <table class='w-full min-w-105 table-auto text-sm sm:text-base'>
          <thead>
            <tr class='border-b border-slate-200'>
              <th class='min-w-24 pb-2 text-left'>{t("common.date")}</th>
              <th class='pb-2 text-left'>{t("common.course")}</th>
              <th class='pb-2 text-left'>{t("common.score")}</th>
              <th class='pb-2 text-right'>{t("sg")}</th>
            </tr>
          </thead>
          <tbody>
            {props.recent.map((round) => (
              <tr class='border-b border-slate-200'>
                <td class='py-2'>{round.date}</td>
                <td class='py-2'>{round.course}</td>
                <td class='py-2'>{round.score ?? "-"}</td>
                <td class='py-2 text-right'>
                  {round.strokesGained == null
                    ? "-"
                    : round.strokesGained.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LatestRounds;
