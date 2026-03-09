import { TLatestRound } from "../lib/definitions";

export const LatestRounds = (props: { recent: TLatestRound[] }) => {
  return (
    <div class='w-full rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm sm:p-6'>
      <h2 class='mb-4 font-rubik text-lg font-semibold sm:text-xl'>
        Latest Rounds
      </h2>

      <div class='w-full overflow-x-auto'>
        <table class='w-full min-w-[420px] table-auto text-sm sm:text-base'>
          <thead>
            <tr class='border-b border-slate-200'>
              <th class='min-w-24 pb-2 text-left'>Date</th>
              <th class='pb-2 text-left'>Course</th>
              <th class='pb-2 text-left'>Score</th>
              <th class='pb-2 text-right'>SG</th>
            </tr>
          </thead>
          <tbody>
            {props.recent.map((round) => (
              <tr class='border-b border-slate-200'>
                <td class='py-2'>{round.date}</td>
                <td class='py-2'>{round.course}</td>
                <td class='py-2'>{round.score}</td>
                <td class='py-2 text-right'>{round.strokesGained}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LatestRounds;
