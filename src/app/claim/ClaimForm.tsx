"use client";

import { useActionState } from "react";
import Link from "next/link";
import { claimDonationAction, type ClaimResult } from "./actions";

export function ClaimForm() {
  const [state, formAction, pending] = useActionState<ClaimResult | null, FormData>(
    claimDonationAction,
    null
  );

  if (state?.ok) {
    return (
      <div className="rounded-card border border-taupe/40 bg-white shadow-card p-6 text-center">
        <p className="font-lora text-xl text-ink">
          {state.count === 1 ? "Your gift is linked." : `${state.count} gifts linked.`}
        </p>
        <p className="text-sm text-soft mt-2">
          Your impact is now part of your Humrahi home.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 text-sm px-5 py-2 rounded-card bg-red text-white hover:bg-crimson transition-colors"
        >
          See your impact
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-card border border-taupe/40 bg-white shadow-card p-6 space-y-4">
      <p className="text-sm text-soft">
        We&apos;ll automatically find any gift made with your account email. If you
        donated with a different email, enter your receipt number below.
      </p>

      <div>
        <label htmlFor="external_id" className="block text-sm text-ink mb-1">
          Donation receipt number
        </label>
        <input
          id="external_id"
          name="external_id"
          type="text"
          placeholder="e.g. RC1001"
          className="w-full text-sm rounded-card border border-taupe/50 bg-whisper px-3 py-2 text-ink placeholder:text-taupe focus:border-ink focus:outline-none"
        />
      </div>

      {state?.error && <p className="text-sm text-red">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full text-sm px-5 py-3 rounded-card bg-red text-white hover:bg-crimson disabled:opacity-40 transition-colors"
      >
        {pending ? "Linking…" : "Claim my gift"}
      </button>
    </form>
  );
}
