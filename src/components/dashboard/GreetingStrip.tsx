// Panel A — Greeting. Mirrors the www welcome-panel voice, adapted to the
// `profiles` schema (no city/joined_at here — those lived on the retired
// `humrahis` table).
export function GreetingStrip({ firstName }: { firstName: string }) {
  return (
    <section aria-label="Welcome">
      <h1 className="font-lora text-2xl sm:text-3xl text-ink leading-snug">
        Welcome back, {firstName} — you&apos;re a Humrahi.
      </h1>
      <span className="block w-10 h-0.5 mt-3 bg-red" aria-hidden="true" />
    </section>
  );
}
