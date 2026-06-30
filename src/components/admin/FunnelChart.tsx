"use client";

// Visitor → Donor → Claimed → Humrahi funnel — the north-star conversion metric.
// Built as a simple horizontal bar chart (Recharts BarChart with layout="vertical")
// since Recharts doesn't have a native FunnelChart in older versions.

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface FunnelChartProps {
  data: { stage: string; count: number }[];
}

export function FunnelChart({ data }: FunnelChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-whisper rounded-card shadow-card p-6">
      <p className="eyebrow mb-1">Visitor → Humrahi funnel</p>
      <p className="text-xs text-taupe-dark mb-4">
        The north-star metric — how many donors become signed-in Humrahis.
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
          <XAxis type="number" domain={[0, max]} hide />
          <YAxis
            type="category"
            dataKey="stage"
            tick={{ fontSize: 12, fill: "#5A4F4A" }}
            width={80}
          />
          <Tooltip
            formatter={(val) => [Number(val ?? 0).toLocaleString("en-IN"), "count"]}
            contentStyle={{ fontSize: 12, borderColor: "#E5D9C2" }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={i === 0 ? "#E5D9C2" : i === 1 ? "#B8A78D" : "#BB1C2A"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-taupe-dark mt-2">Source: donations + humrahis tables</p>
    </div>
  );
}
