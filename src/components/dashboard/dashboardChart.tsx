import { createMemo, onMount } from "solid-js";
import { useTransContext } from "@mbarzda/solid-i18next";

import {
  Chart,
  Title,
  Tooltip,
  Legend,
  Colors,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
} from "chart.js";
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
);

import { Bar } from "solid-chartjs";
import { SGColors } from "../../lib/graphColors";

import { TStrokesGained } from "../../lib/definitions";

type SGChartProps = {
  currentSG: TStrokesGained[];
};

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const rgb = (name: string, alpha = 1) => `rgb(${css(name)} / ${alpha})`;

export default function DashboardChart(props: SGChartProps) {
  const [t] = useTransContext();

  onMount(() => {
    Chart.register(Title, Tooltip, Legend, Colors);
  });

  const chartData = createMemo(() => ({
    labels: props.currentSG.map((item) => item.title),
    datasets: [
      {
        minBarLength: 7,
        data: props.currentSG.map((item) => item.score),
        backgroundColor: props.currentSG.map(
          (_, index) => SGColors[index % SGColors.length],
        ),
      },
    ],
  }));

  const chartOptions = createMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    barPercentage: 0.8,
    scales: {
      x: {
        ticks: {
          color: "gray",
          font: { size: 12 },
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: "gray",
        },
      },
    },
    plugins: {
      legend: { display: false },
      title: {
        display: false,
        text: t("dashboard.chart.title"),
      },
      tooltip: {
        backgroundColor: () => rgb("--chart-tooltip-bg"),
        titleColor: () => rgb("--chart-tooltip-text"),
        bodyColor: () => rgb("--chart-tooltip-text"),
        borderWidth: 0,
        padding: 10,
      },
    },
  }));

  return (
    <div class='w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
      <h2 class='mb-4 font-rubik text-lg font-semibold text-slate-800 sm:text-xl'>
        {t("dashboard.chart.title")}
      </h2>
      <div class='h-65 sm:h-80'>
        <Bar
          data={chartData()}
          options={chartOptions()}
          fallback={
            <div class='text-slate-600'>{t("dashboard.chart.empty")}</div>
          }
        />
      </div>
    </div>
  );
}
