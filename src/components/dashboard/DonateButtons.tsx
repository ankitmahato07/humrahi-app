"use client";

import { useEffect, useState } from "react";

const AMOUNTS = [500, 1000, 2500];

// Same reconciliation-ref algorithm as the static site's donate.html:
// SHA-256(lowercased, trimmed email) → first 16 hex chars (8 bytes).
async function hashEmail(email: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(email.trim().toLowerCase())
  );
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function DonateButtons({ email }: { email: string }) {
  const [ref, setRef] = useState("");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (email && typeof window !== "undefined" && window.crypto?.subtle) {
      hashEmail(email)
        .then((h) => {
          if (!cancelled) setRef(h);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [email]);

  function sevaUrl(amount: number) {
    return `https://www.sevastack.in/donate/HF?amount=${amount}${ref ? `&ref=${ref}` : ""}`;
  }

  const customAmount = Number(custom);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-3">Give once</p>
        <div className="flex flex-wrap items-center gap-3">
          {AMOUNTS.map((amt) => (
            <a key={amt} href={sevaUrl(amt)} target="_blank" rel="noopener" className="btn-red">
              Give ₹{amt.toLocaleString("en-IN")}
            </a>
          ))}
          <input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="Custom amount"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            aria-label="Custom donation amount in rupees"
            className="border border-sand rounded-sm px-3 py-2.5 text-sm w-36 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
          />
          {customAmount > 0 && (
            <a
              href={sevaUrl(customAmount)}
              target="_blank"
              rel="noopener"
              className="btn-ghost"
            >
              Give ₹{customAmount.toLocaleString("en-IN")} →
            </a>
          )}
        </div>
        <p className="text-xs text-taupe-dark mt-3">
          Opens our donation partner Sevastack in a new tab. Your 80G receipt is emailed
          automatically.
        </p>
      </div>

      <div>
        <p className="eyebrow mb-3">Give monthly</p>
        <a
          href="https://www.myhumrahi.org/donate.html"
          target="_blank"
          rel="noopener"
          className="btn-ghost inline-block"
        >
          Set up a monthly gift on our donate page →
        </a>
      </div>
    </div>
  );
}
