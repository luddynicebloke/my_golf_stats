import { A } from "@solidjs/router";
import { TLatestRound } from "../lib/definitions";

export const LatestRounds = (props: { recent: TLatestRound[] }) => {
  return (
    <div class='w-full md:col-span-4'>
      <h2 class='mb-4 text-xl md:text-2xl'>Latest Rounds</h2>

      <div class='rounded-xl bg-gray-50 dark:bg-gray-800/75 p-4'>
        <div class='w-full'>
          <table class='w-full table-auto'>
            <thead>
              <tr class='border-b border-gray-200 dark:border-gray-700'>
                <th class='pb-2 text-left min-w-24'>Date</th>
                <th class='pb-2 text-left'>Course</th>
                <th class='pb-2 text-left'>Score</th>
                <th class='pb-2 text-right'>SG</th>
              </tr>
            </thead>
            <tbody>
              {props.recent.map((round) => (
                <tr class='border-b border-gray-200 dark:border-gray-700'>
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
    </div>
  );
};

export default LatestRounds;
