"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS: Record<string, string> = {
  meals: "#BB1C2A",
  health: "#7E1A20",
  school: "#B8A78D",
  general: "#E5D9C2",
};

interface DesignationDonutProps {
  data: { name: string; value: number }[];
}

export function DesignationDonut({ data }: DesignationDonutProps) {
  return (
    <div className="bg-whisper rounded-card shadow-card p-6 h-full">
      <p className="eyebrow mb-4">By fund</p>
      {data.length === 0 ? (
        <p className="text-sm text-soft py-8 text-center">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] ?? "#B8A78D"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val) => [`₹${Number(val ?? 0).toLocaleString("en-IN")}`, ""]}
              contentStyle={{ fontSize: 12, borderColor: "#E5D9C2" }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(v) => <span style={{ fontSize: 11, color: "#5A4F4A" }}>{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
