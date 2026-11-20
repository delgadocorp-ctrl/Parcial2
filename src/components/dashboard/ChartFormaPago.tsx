"use client";

import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import type { TooltipItem } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { formatearMoneda } from "@/lib/formatters";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ChartFormaPagoProps {
  porFormaDePago: Array<{ forma: string; importe: number }>;
}

export function ChartFormaPago({ porFormaDePago }: ChartFormaPagoProps) {
  const nombresFormas: Record<string, string> = {
    contado: "Contado",
    tarjeta: "Tarjeta",
    cuenta_corriente: "Cuenta Corriente",
  };

  const labels = porFormaDePago.map((p) => nombresFormas[p.forma] || p.forma);
  const dataValues = porFormaDePago.map((p) => p.importe / 100);

  const data = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: [
          "#34d399", // Emerald
          "#60a5fa", // Blue
          "#f59e0b", // Amber
        ],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          boxWidth: 12,
          font: { size: 11 },
          padding: 14,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"doughnut">) => {
            const valCentavos = Math.round(Number(context.raw) * 100);
            return ` ${context.label}: ${formatearMoneda(valCentavos)}`;
          },
        },
      },
    },
    cutout: "68%",
  };

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <Doughnut data={data} options={options} />
    </div>
  );
}
