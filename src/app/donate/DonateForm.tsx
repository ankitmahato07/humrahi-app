"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [500, 1000, 2500, 5000];

const DESIGNATIONS = [
  { value: "general", label: "Where it's needed most" },
  { value: "meals", label: "Meals" },
  { value: "health", label: "Health camps" },
  { value: "school", label: "School terms" },
] as const;

type Frequency = "once" | "monthly";

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
  const [frequency, setFrequency] = useState<Frequency>("once");
  const [designation, setDesignation] = useState<string>("general");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const scriptLoaded = useRef(false);

  // Pre-fill from ?amount= and ?freq=monthly (the static site's donate page
  // passes the chosen amount and frequency through). Read from window to
  // avoid a useSearchParams Suspense boundary for a one-off read.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = Number(params.get("amount"));
    if (Number.isInteger(fromUrl) && fromUrl >= 10 && fromUrl <= 500_000) {
      if (PRESETS.includes(fromUrl)) {
        setAmount(fromUrl);
      } else {
        setCustomAmount(String(fromUrl));
      }
    }
    // Anything other than the exact value "monthly" stays one-time.
    if (params.get("freq") === "monthly") setFrequency("monthly");
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
      const monthly = frequency === "monthly";
      const checkoutRes = await fetch(
        monthly ? "/api/razorpay/subscription" : "/api/razorpay/order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount_inr: effectiveAmount, designation }),
        }
      );
      const order = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(order.error ?? "Could not start the payment");

      const checkout = new window.Razorpay({
        key: order.key_id,
        // A subscription checkout takes subscription_id; a one-time payment
        // takes order_id + amount + currency. Never both.
        ...(monthly
          ? { subscription_id: order.subscription_id }
          : { order_id: order.order_id, amount: order.amount, currency: order.currency }),
        name: "Humrahi Foundation",
        description: monthly ? "Monthly donation" : "Donation",
        image: "/icon-192.png",
        notes: { designation },
        theme: { color: "#BB1C2A" },
        modal: {
          ondismiss: () => setStatus({ state: "idle" }),
        },
        handler: async (resp: {
          razorpay_order_id?: string;
          razorpay_subscription_id?: string;
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
          {frequency === "monthly" ? (
            <>
              Your monthly gift of <strong>₹{effectiveAmount.toLocaleString("en-IN")}</strong> is
              set up — the first one is already on its way to Siliguri, and Razorpay
              will handle each month automatically. You can pause or cancel anytime
              from the link in Razorpay&apos;s email, or by writing to
              wecare@myhumrahi.org. Your 80G receipt follows from our team.
            </>
          ) : (
            <>
              Your gift of <strong>₹{effectiveAmount.toLocaleString("en-IN")}</strong> is on
              its way to Siliguri. Razorpay has emailed you a payment confirmation
              — your 80G receipt follows from our team.
            </>
          )}
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
      <fieldset className="mb-5">
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-taupe-dark">
          How often
        </legend>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Donation frequency">
          {(
            [
              { value: "once", label: "Give once" },
              { value: "monthly", label: "Give monthly" },
            ] as const
          ).map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={frequency === f.value}
              onClick={() => setFrequency(f.value)}
              className={`rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                frequency === f.value
                  ? "border-red bg-red text-white"
                  : "border-taupe/50 bg-white text-ink hover:border-red"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {frequency === "monthly" && (
          <p className="mt-2 text-xs leading-relaxed text-taupe-dark">
            Razorpay charges this amount automatically every month (UPI Autopay,
            card or netbanking mandate). Cancel anytime.
          </p>
        )}
      </fieldset>

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
          : !amountValid
            ? "Enter ₹10 – ₹5,00,000"
            : frequency === "monthly"
              ? `Give ₹${effectiveAmount.toLocaleString("en-IN")} every month`
              : `Donate ₹${effectiveAmount.toLocaleString("en-IN")}`}
      </button>
    </div>
  );
}
