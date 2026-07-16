"use client";

import { useState } from "react";
import type { SevaDonation } from "@/lib/sevastack";

// One row on /donations: amount, date, receipt no, status badge, and the
// two receipt actions. Download is a plain <a> (browser handles the PDF
// response); Email receipt POSTs and shows an optimistic "Sent ✓".
export function DonationRow({ donation }: { donation: SevaDonation }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const verified = donation.status === "VERIFIED";

  async function emailReceipt() {
    setState("sending");
    try {
      const res = await fetch("/api/receipts/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationId: donation.id }),
      });
      const body = (await res.json().catch(() => ({ ok: false }))) as { ok?: boolean };
      setState(body.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <li className="flex items-center gap-3 flex-wrap py-4">
      <span className="font-lora text-lg font-bold text-ink flex-shrink-0">
        ₹{donation.amountInr.toLocaleString("en-IN")}
      </span>
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="text-sm text-ink">
          {new Date(donation.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        {donation.receiptNo && (
          <span className="text-xs text-taupe tracking-wide">Receipt {donation.receiptNo}</span>
        )}
      </div>
      <span
        className={
          "text-xs font-bold tracking-wide uppercase px-2.5 py-1 rounded-sm flex-shrink-0 " +
          (verified ? "bg-[#e7f2e9] text-[#2f7d3b]" : "bg-sand text-taupe-dark")
        }
      >
        {verified ? "Received" : "Pending"}
      </span>
      <span className="flex-1" aria-hidden="true" />
      {verified && (
        <>
          <a
            href={`/api/receipts/${donation.id}`}
            className="text-xs font-semibold border border-sand rounded-sm px-3 py-1.5 text-ink hover:border-red hover:text-red transition-colors flex-shrink-0"
          >
            Download 80G
          </a>
          <button
            type="button"
            onClick={emailReceipt}
            disabled={state === "sending" || state === "sent"}
            className="text-xs font-semibold border border-sand rounded-sm px-3 py-1.5 text-ink hover:border-red hover:text-red transition-colors disabled:opacity-60 disabled:hover:border-sand disabled:hover:text-ink flex-shrink-0"
          >
            {state === "sent" ? "Sent ✓" : state === "sending" ? "Sending…" : "Email receipt"}
          </button>
        </>
      )}
      {state === "error" && (
        <span className="text-xs text-red w-full">Couldn&apos;t send — try again.</span>
      )}
    </li>
  );
}
