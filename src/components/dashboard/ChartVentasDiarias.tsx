"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { TooltipItem } from "chart.js";
import { formatearMoneda } from "@/lib/formatters";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartVentasDiariasProps {
  ventasDiarias: Array<{ fecha: string; importe: number }>;
}

export function ChartVentasDiarias({ ventasDiarias }: ChartVentasDiariasProps) {
  // Formatear etiquetas de fecha a dd/mm
  const labels = ventasDiarias.map((d) => {
    const parts = d.fecha.split("-");
    return `${parts[2]}/${parts[1]}`;
  });

  const dataValues = ventasDiarias.map((d) => d.importe / 100);

  const data = {
    labels,
    datasets: [
      {
        label: "Ventas ($)",
        data: dataValues,
        fill: true,
        borderColor: "#2d5a47",
        backgroundColor: "rgba(45, 90, 71, 0.12)",
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: "#2d5a47",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"line">) => {
            const valCentavos = Math.round(Number(context.raw) * 100);
            return ` Ventas: ${formatearMoneda(valCentavos)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 10,
          font: { size: 10 },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: (value: string | number) => `$ ${(Number(value) / 1000).toFixed(0)}k`,
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
