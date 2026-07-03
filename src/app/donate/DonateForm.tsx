"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [500, 1000, 2500, 5000];

const DESIGNATIONS = [
  { value: "general", label: "Where it's needed most" },
  { value: "meals", label: "Meals" },
  { value: "health", label: "Health camps" },
  { value: "school", label: "School terms" },
] as const;

type Status =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; paymentId: string }
  | { state: "error"; message: string };

interface RazorpayCheckout {
  open(): void;
  on(event: string, handler: (resp: unknown) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

export default function DonateForm() {
  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [designation, setDesignation] = useState<string>("general");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const scriptLoaded = useRef(false);

  // Pre-fill from ?amount= (the static site's donate page passes the chosen
  // amount through). Read from window to avoid a useSearchParams Suspense
  // boundary for a one-off read.
  useEffect(() => {
    const fromUrl = Number(new URLSearchParams(window.location.search).get("amount"));
    if (Number.isInteger(fromUrl) && fromUrl >= 10 && fromUrl <= 500_000) {
      if (PRESETS.includes(fromUrl)) {
        setAmount(fromUrl);
      } else {
        setCustomAmount(String(fromUrl));
      }
    }
  }, []);

  // Load Razorpay Checkout once on mount.
  useEffect(() => {
    if (window.Razorpay || scriptLoaded.current) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    scriptLoaded.current = true;
  }, []);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;
  const amountValid =
    Number.isInteger(effectiveAmount) && effectiveAmount >= 10 && effectiveAmount <= 500_000;

  async function donate() {
    if (!amountValid || status.state === "loading") return;
    if (!window.Razorpay) {
      setStatus({ state: "error", message: "Payment library is still loading — try again in a moment." });
      return;
    }
    setStatus({ state: "loading" });

    try {
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_inr: effectiveAmount, designation }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not start the payment");

      const checkout = new window.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: "Humrahi Foundation",
        description: "Donation",
        image: "/icon-192.png",
        notes: { designation },
        theme: { color: "#BB1C2A" },
        modal: {
          ondismiss: () => setStatus({ state: "idle" }),
        },
        handler: async (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // Record the donation. The server webhook is the safety net if
          // this request never lands.
          try {
            await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(resp),
            });
          } catch {
            // Payment already succeeded — webhook will reconcile.
          }
          setStatus({ state: "success", paymentId: resp.razorpay_payment_id });
        },
      });
      checkout.on("payment.failed", () => {
        setStatus({ state: "error", message: "The payment didn't go through. Nothing was charged — please try again." });
      });
      checkout.open();
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    }
  }

  if (status.state === "success") {
    return (
      <div className="rounded-card bg-whisper p-8 text-center shadow-card">
        <p className="font-lora text-2xl text-ink">Thank you, humrahi. 🙏</p>
        <p className="mt-3 text-sm leading-relaxed text-soft">
          Your gift of <strong>₹{effectiveAmount.toLocaleString("en-IN")}</strong> is on
          its way to Siliguri. Razorpay has emailed you a payment confirmation
          — your 80G receipt follows from our team.
        </p>
        <p className="mt-4 text-xs text-taupe-dark">Payment ID: {status.paymentId}</p>
        <a
          href="/auth/login"
          className="mt-6 inline-block rounded-full bg-red px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-crimson"
        >
          See the impact of your gift →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-whisper p-6 shadow-card sm:p-8">
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-taupe-dark">
          Choose an amount
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setAmount(p);
                setCustomAmount("");
              }}
              className={`rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                !customAmount && amount === p
                  ? "border-red bg-red text-white"
                  : "border-taupe/50 bg-white text-ink hover:border-red"
              }`}
            >
              ₹{p.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="sr-only">Custom amount in rupees</span>
          <input
            type="number"
            inputMode="numeric"
            min={10}
            max={500000}
            placeholder="Or enter your own amount (₹)"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="w-full rounded-lg border border-taupe/50 bg-white px-4 py-3 text-sm text-ink placeholder:text-taupe focus:border-red focus:outline-none"
          />
        </label>
      </fieldset>

      <label className="mt-5 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-taupe-dark">
          Direct it to
        </span>
        <select
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          className="w-full rounded-lg border border-taupe/50 bg-white px-4 py-3 text-sm text-ink focus:border-red focus:outline-none"
        >
          {DESIGNATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      {status.state === "error" && (
        <p role="alert" className="mt-4 rounded-lg bg-red/10 px-4 py-3 text-sm text-crimson">
          {status.message}
        </p>
      )}

      <button
        type="button"
        onClick={donate}
        disabled={!amountValid || status.state === "loading"}
        className="mt-6 w-full rounded-full bg-red px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-crimson disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status.state === "loading"
          ? "Opening secure checkout…"
          : amountValid
            ? `Donate ₹${effectiveAmount.toLocaleString("en-IN")}`
            : "Enter ₹10 – ₹5,00,000"}
      </button>
    </div>
  );
}
