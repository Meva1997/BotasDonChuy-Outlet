"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Period, RevenuePoint } from "./types";

const PERIODS: { label: string; value: Period }[] = [
  { label: "7 días", value: "7" },
  { label: "30 días", value: "30" },
  { label: "90 días", value: "90" },
];

function formatY(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

interface Props {
  dataByPeriod: Record<Period, RevenuePoint[]>;
}

export default function RevenueChart({ dataByPeriod }: Props) {
  const [period, setPeriod] = useState<Period>("30");
  const data = dataByPeriod[period];

  return (
    <div className="rounded-lg border border-amber-400/20 bg-stone-900/60 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl text-amber-50">Ventas diarias</h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-xs font-sans tracking-wide rounded border transition-colors cursor-pointer ${
                period === p.value
                  ? "border-amber-400 text-amber-400 bg-amber-400/10"
                  : "border-amber-400/20 text-amber-100/40 hover:border-amber-400/50 hover:text-amber-100/70"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#b45309" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#44403c"
            strokeOpacity={0.3}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{
              fill: "#a8967a",
              fontSize: 11,
              fontFamily: "var(--font-jost)",
            }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatY}
            tick={{
              fill: "#a8967a",
              fontSize: 11,
              fontFamily: "var(--font-jost)",
            }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{
              background: "#1c1917",
              border: "1px solid rgba(180,83,9,0.3)",
              borderRadius: 6,
              color: "#fef9ef",
              fontFamily: "var(--font-jost)",
              fontSize: 12,
            }}
            formatter={(v) => [
              `$${Number(v).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              "Ingresos",
            ]}
            labelStyle={{ color: "#a8967a", marginBottom: 4 }}
            cursor={{ stroke: "#b45309", strokeOpacity: 0.4 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#d97706"
            strokeWidth={1.5}
            fill="url(#revenueGrad)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#d97706",
              stroke: "#1c1917",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
