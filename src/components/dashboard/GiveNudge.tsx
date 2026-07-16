import Link from "next/link";

// Panel D (b) — a quiet, non-blocking invitation. Never a modal. Callers
// (page.tsx) are responsible for hiding this when the donor gave in the
// last 30 days.
export function GiveNudge() {
  return (
    <section aria-label="When you're ready">
      <div className="rounded-card bg-whisper border border-sand p-6 text-center">
        <p className="text-ink text-sm leading-relaxed max-w-sm mx-auto">
          When you&apos;re ready to walk further, your next gift goes straight to the ground in
          Siliguri.
        </p>
        <Link
          href="/campaigns"
          className="inline-flex items-center justify-center gap-2 font-inter font-medium rounded-card transition-colors duration-150 px-4 py-2 text-sm bg-transparent text-red border border-red hover:bg-red hover:text-white mt-4"
        >
          See what&apos;s needed
        </Link>
      </div>
    </section>
  );
}
