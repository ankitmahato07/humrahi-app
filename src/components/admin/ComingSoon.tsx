export function ComingSoon({
  title,
  description,
  planned,
}: {
  title: string;
  description: string;
  planned: string[];
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-lora text-2xl text-ink">{title}</h1>
        <p className="text-sm text-soft mt-1">{description}</p>
      </div>
      <div className="rounded-card border border-taupe/40 bg-whisper p-8">
        <span className="inline-block text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-card bg-sand text-taupe-dark">
          Coming soon
        </span>
        <p className="text-sm text-soft mt-4">This section will let you:</p>
        <ul className="mt-2 space-y-1.5 text-sm text-ink list-disc pl-5">
          {planned.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
