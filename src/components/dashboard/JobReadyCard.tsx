import Link from "next/link";
import type { JobReadyStatus } from "@/lib/jobready";

// SERVER COMPONENT (no "use client"). status.enrolUrl only exists in the
// unlocked branch and is rendered server-side, so the Wadhwani URL never ships
// in a client chunk — it reaches the browser only inside a confirmed
// beneficiary's own page HTML.
export function JobReadyCard({ status }: { status: JobReadyStatus }) {
  if (status.kind === "unlocked") {
    return (
      <section aria-label="Your JobReady skilling">
        <div className="rounded-card border border-sand bg-white p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-red">
            JobReady × Wadhwani Foundation
          </p>
          <h2 className="mt-1 font-lora text-xl text-ink">You&apos;re all set to start learning 🎉</h2>
          <p className="mt-2 text-sm leading-relaxed text-soft">
            Our team has set you up as a Humrahi beneficiary. Tap below to enrol in your free
            Wadhwani Foundation courses. Finishing courses unlocks the Job Connect job portal, where
            you can explore openings.
          </p>
          <a
            href={status.enrolUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-card bg-red px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-crimson"
          >
            Enrol in free courses →
          </a>
        </div>
      </section>
    );
  }

  if (status.kind === "pending") {
    return (
      <section aria-label="Your JobReady skilling">
        <div className="rounded-card border border-sand bg-whisper p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-taupe-dark">
            JobReady skilling
          </p>
          <h2 className="mt-1 font-lora text-xl text-ink">Registration received ✅</h2>
          <p className="mt-2 text-sm leading-relaxed text-soft">
            Our team is setting up your free Wadhwani Foundation skilling. Keep an eye on WhatsApp and
            email — your enrolment link will arrive there, and it&apos;ll appear right here once
            you&apos;re confirmed.
          </p>
        </div>
      </section>
    );
  }

  // No signup on record → gentle promo (no Wadhwani URL).
  return (
    <section aria-label="Free JobReady skilling">
      <div className="rounded-card border border-sand bg-whisper p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-red">New</p>
        <h2 className="mt-1 font-lora text-xl text-ink">
          Free JobReady skilling with Wadhwani Foundation
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-soft">
          Free online courses with a certificate — Humrahi is your local training partner. Register
          and our team will get you started.
        </p>
        <Link
          href="/jobready"
          className="mt-4 inline-flex items-center justify-center rounded-card border border-red px-5 py-2 text-sm font-medium text-red transition-colors hover:bg-red hover:text-white"
        >
          Learn more
        </Link>
      </div>
    </section>
  );
}
