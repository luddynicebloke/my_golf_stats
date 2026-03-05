import Card from "../components/dashboard/card";

import DashboardChart from "./DashboardChart";
import { tempRoundsData, tempStatsData } from "../lib/tempData";
import LatestRounds from "./LatestRounds";
import { useAuth } from "../context/AuthProvider";

export default function Dashboard() {
  const stats = tempStatsData;
  const { role } = useAuth();

  return (
    <div>
      <h1 class='mb-4 text-xl md:text-2xl'>Dashboard</h1>
      {role() === "admin" && (
        <div class='mb-4'>
          <a href='/admin' class='text-blue-500 hover:underline'>
            Admin Panel
          </a>
        </div>
      )}
      <div class='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
        <Card title='N° of Rounds' value={"6"} type='rounds' />
        <Card title='Score to par' value={"+12"} type='topar' />
        <Card title='Average score' value={"74.33"} type='average' />
        <Card title='Strokes Gained' value={"-1.95"} type='stats' />
      </div>
      <div class='mt-6 grid w-full grid-cols 1 gap-6 md:grid-cols-4 lg:grid-cols-8'>
        <DashboardChart currentSG={stats} />
        <LatestRounds recent={tempRoundsData} />
      </div>
    </div>
  );
}
