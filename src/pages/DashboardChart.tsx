import { onMount } from "solid-js";

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
import { SGColors } from "../lib/graphColors";

import { TStrokesGained } from "../lib/definitions";

type SGChartProps = {
  currentSG: TStrokesGained[];
};

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const rgb = (name: string, alpha = 1) => `rgb(${css(name)} / ${alpha})`;

export default function DashboardChart(props: SGChartProps) {
  onMount(() => {
    Chart.register(Title, Tooltip, Legend, Colors);
  });

  const chartData = {
    labels: ["Driving", "Approach", "Chipping", "Putting", "Tee-to-green"],
    datasets: [
      {
        minBarLength: 7,
        data: [0.3, -0.9, 0.5, 0.0, -0.6],
        backgroundColor: SGColors,
      },
    ],
  };

  const chartOptions = {
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
        text: "Strokes Gained Overview",
      },
      tooltip: {
        backgroundColor: () => rgb("--chart-tooltip-bg"),
        titleColor: () => rgb("--chart-tooltip-text"),
        bodyColor: () => rgb("--chart-tooltip-text"),
        borderWidth: 0,
        padding: 10,
      },
    },
  };

  return (
    <div class='w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
      <h2 class='mb-4 font-rubik text-lg font-semibold text-slate-800 sm:text-xl'>
        Current Strokes Gained
      </h2>
      <div class='h-[260px] sm:h-[320px]'>
        <Bar
          data={chartData}
          options={chartOptions}
          fallback={<div class='text-slate-600'>No data available</div>}
        />
      </div>
    </div>
  );
}
