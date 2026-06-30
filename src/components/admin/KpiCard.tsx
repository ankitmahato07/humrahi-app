interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
}

export function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="bg-whisper rounded-card shadow-card p-5">
      <p className="text-xs font-semibold text-taupe-dark uppercase tracking-wider mb-2">{label}</p>
      <p className="font-lora text-2xl text-ink leading-none">{value}</p>
      {sub && <p className="text-xs text-soft mt-1.5">{sub}</p>}
    </div>
  );
}
