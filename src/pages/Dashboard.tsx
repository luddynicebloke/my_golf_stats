import Card from "../components/dashboard/card";

import DashboardChart from "./DashboardChart";
import { tempRoundsData, tempStatsData } from "../lib/tempData";
import LatestRounds from "./LatestRounds";
import { useAuth } from "../context/AuthProvider";

export default function Dashboard() {
  const stats = tempStatsData;
  const { role, user } = useAuth();

  return (
    <div class='w-full'>
      <div class='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <h1 class='font-rubik text-2xl text-gray-600 font-semibold tracking-tight md:text-3xl'>
          Dashboard
        </h1>
        {role() === "admin" && (
          <a
            href='/admin'
            class='inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 font-grotesk text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100'
          >
            Admin Panel
          </a>
        )}
      </div>

      <div class='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <Card title='N° of Rounds' value={"6"} type='rounds' />
        <Card title='Score to par' value={"+12"} type='topar' />
        <Card title='Average score' value={"74.33"} type='average' />
        <Card title='Strokes Gained' value={"-1.95"} type='stats' />
      </div>

      <div class='mt-6 grid w-full grid-cols-1 gap-6 xl:grid-cols-12'>
        <div class='xl:col-span-7'>
          <DashboardChart currentSG={stats} />
        </div>
        <div class='xl:col-span-5'>
          <LatestRounds recent={tempRoundsData} />
        </div>
      </div>
    </div>
  );
}
