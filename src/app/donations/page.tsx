import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDonorContext } from "@/lib/donor";
import { AppNav } from "@/components/ui/AppNav";
import { DonationRow } from "@/components/dashboard/DonationRow";

export const metadata: Metadata = { title: "Your giving" };

export default async function DonationsPage() {
  const donor = await getDonorContext();
  if (!donor) redirect("/auth/login");
  if (!donor.profile) redirect("/auth/setup");
  if (!donor.profile.full_name) redirect("/auth/setup");

  return (
    <>
      <AppNav userName={donor.profile.full_name} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-lora text-2xl text-ink mb-1">Your giving</h1>
        <span className="block w-8 h-0.5 bg-red mb-3" aria-hidden="true" />

        {donor.donations.length > 0 && (
          <p className="text-soft text-sm mb-8">
            <span className="font-lora text-xl text-ink">
              ₹{donor.totalInr.toLocaleString("en-IN")}
            </span>{" "}
            given across {donor.donations.length} donation{donor.donations.length === 1 ? "" : "s"}
          </p>
        )}

        {donor.donations.length === 0 ? (
          <p className="text-soft text-sm leading-relaxed mt-8">
            No donations yet under <strong className="text-ink">{donor.user.email}</strong>.{" "}
            <a
              href="https://www.myhumrahi.org/donate.html"
              className="text-red underline hover:text-crimson transition-colors"
            >
              Make your first gift →
            </a>
            <br />
            <span className="text-taupe text-xs">
              Gave with a different email?{" "}
              <a href="mailto:wecare@myhumrahi.org" className="underline">
                Tell us
              </a>{" "}
              and we&apos;ll link it to your account.
            </span>
          </p>
        ) : (
          <ul className="divide-y divide-sand">
            {donor.donations.map((d) => (
              <DonationRow key={d.id} donation={d} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
