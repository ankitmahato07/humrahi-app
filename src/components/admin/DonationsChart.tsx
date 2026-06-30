"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DonationsChartProps {
  data: { date: string; amount: number }[];
}

export function DonationsChart({ data }: DonationsChartProps) {
  return (
    <div className="bg-whisper rounded-card shadow-card p-6">
      <p className="eyebrow mb-4">Donations — last 30 days</p>
      {data.length === 0 ? (
        <p className="text-sm text-soft py-8 text-center">No donations in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="donationGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#BB1C2A" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#BB1C2A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5D9C2" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#6B5D45" }}
              tickFormatter={(v) => v.slice(5)} // show MM-DD
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6B5D45" }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(val) => [`₹${Number(val ?? 0).toLocaleString("en-IN")}`, "Raised"]}
              labelFormatter={(l) => new Date(l).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              contentStyle={{ fontSize: 12, borderColor: "#E5D9C2" }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#BB1C2A"
              strokeWidth={2}
              fill="url(#donationGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <p className="text-xs text-taupe-dark mt-3">Source: donations table · synced from Sevastack</p>
    </div>
  );
}
