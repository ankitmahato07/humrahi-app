// ─────────────────────────────────────────────────────────────────────────────
// create-subscription — Supabase Edge Function (Deno)
//
// The static site's donate page calls this when a donor picks "Give monthly".
// It creates a Razorpay Plan (reusing an existing one for the same amount)
// and a Subscription, then returns the subscription's hosted checkout link
// (short_url). That page offers UPI Autopay, cards and eMandate — verified
// live 2026-07-14 — so monthly giving needs no WhatsApp/manual step.
//
// Logic ported from the decommissioned portal's tested code:
//   humrahi-app/src/lib/razorpay.ts (findOrCreateMonthlyPlan, createSubscription)
//   humrahi-app/src/app/api/razorpay/subscription/route.ts (validation bounds)
//
// Env (Supabase Dashboard → Edge Functions → create-subscription → Secrets):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET   (live API key pair)
//   ALLOWED_ORIGIN                          (default https://www.myhumrahi.org)
//
// Deploy:  supabase functions deploy create-subscription --no-verify-jwt
// (public endpoint — called by unauthenticated website visitors; abuse surface
// is only free short-lived "created" subscriptions, which expire unpaid)
// ─────────────────────────────────────────────────────────────────────────────

const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://www.myhumrahi.org";

const MIN_INR = 10;
const MAX_INR = 500_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

async function rzp<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Razorpay ${path} ${r.status}: ${data?.error?.description ?? "unknown"}`);
  return data as T;
}

interface Plan {
  id: string;
  period: string;
  interval: number;
  item: { amount: number; currency: string };
}

// Reuse an existing monthly plan for this amount, or create one. Razorpay has
// no plan-delete API, so matching keeps the list tidy for the preset tiers.
// Lookup covers the first 100 plans — beyond that a duplicate plan gets
// created, which is harmless (donors are charged by subscription).
async function findOrCreateMonthlyPlan(amountPaise: number): Promise<Plan> {
  const existing = await rzp<{ items: Plan[] }>("/plans?count=100");
  const match = existing.items.find(
    (p) =>
      p.period === "monthly" &&
      p.interval === 1 &&
      p.item.amount === amountPaise &&
      p.item.currency === "INR",
  );
  if (match) return match;

  const rupees = (amountPaise / 100).toLocaleString("en-IN");
  return rzp<Plan>("/plans", {
    method: "POST",
    body: JSON.stringify({
      period: "monthly",
      interval: 1,
      item: {
        name: `Humrahi monthly giving — ₹${rupees}`,
        amount: amountPaise,
        currency: "INR",
        description: "Monthly donation to Humrahi Foundation",
      },
      notes: { source: "website_donate_page" },
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!KEY_ID || !KEY_SECRET) return json({ ok: false, error: "not_configured" }, 503);

  let payload: { amount_inr?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const amountInr = Number(payload.amount_inr);
  if (!Number.isInteger(amountInr) || amountInr < MIN_INR || amountInr > MAX_INR) {
    return json({ ok: false, error: "invalid_amount" }, 400);
  }

  try {
    const plan = await findOrCreateMonthlyPlan(amountInr * 100);
    const sub = await rzp<{ id: string; short_url: string | null }>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: plan.id,
        // 120 monthly cycles = 10 years of giving; the donor can cancel anytime.
        total_count: 120,
        // Razorpay emails the donor the mandate details + manage/cancel link.
        customer_notify: 1,
        notes: { source: "website_donate_page", frequency: "monthly" },
      }),
    });
    if (!sub.short_url) return json({ ok: false, error: "no_link" }, 502);
    return json({ ok: true, url: sub.short_url });
  } catch (e) {
    console.error("create-subscription error:", e);
    return json({ ok: false, error: "server_error" }, 502);
  }
});
