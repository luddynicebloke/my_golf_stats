import { onMount } from "solid-js";

import { Chart, BarElement, Title, Tooltip, Legend, Colors } from "chart.js";
import { Bar } from "solid-chartjs";
import { SGColors } from "../lib/graphColors";

import { TStrokesGained } from "../lib/definitions";
import { BsAspectRatio } from "solid-icons/bs";
import { style } from "solid-js/web";
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
        legend: { text: "Strokes Gained", display: true },
        minBarLength: 7,
        data: [0.3, -0.9, 0.5, 0.0, -0.6],
        backgroundColor: SGColors,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
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
      customCanvasBackgroundColor: {
        color: "lightGreen",
      },
      annotation: {
        annotations: [
          {
            id: "a-line-1",
            type: "line",
            mode: "horizontal",
            scaleID: "y",
            value: "0",
            borderColor: "red",
            borderWidth: 2,
          },
        ],
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
    <div class='w-full md:col-span-4'>
      <h2 class='mb-4 text-xl md-text-2xl'>Current Strokes Gained </h2>
      <div class='rounded-xl bg-gray-50 dark:bg-gray-800/75 p-4'>
        <div class=''>
          <Bar
            data={chartData}
            options={chartOptions}
            fallback={<div>No data available</div>}
          />
        </div>
      </div>
    </div>
  );
}
