import type { Metadata } from "next";
import DonateForm from "./DonateForm";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Give securely via UPI, card or netbanking. Donations to Humrahi Foundation are eligible for 50% tax exemption under Section 80G.",
  robots: { index: true, follow: true },
};

export default function DonatePage() {
  return (
    <main className="min-h-screen bg-cloud px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-lg">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-taupe-dark">
          Humrahi Foundation
        </p>
        <h1 className="text-center font-lora text-3xl font-medium text-ink sm:text-4xl">
          Walk with us
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-soft">
          Every rupee goes to meals, health camps and school terms in Siliguri.
          Pay securely with UPI, card or netbanking — you&apos;ll get a receipt,
          and donations are eligible for 50% tax exemption under Section 80G.
        </p>
        <div className="mt-8">
          <DonateForm />
        </div>
        <p className="mt-6 text-center text-xs text-taupe-dark">
          Payments are processed by Razorpay. Humrahi Foundation never sees your
          card or UPI credentials.
        </p>
      </div>
    </main>
  );
}
