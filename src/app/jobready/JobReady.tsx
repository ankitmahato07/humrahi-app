"use client";

import { useState } from "react";

type Lang = "bn" | "en";

// The Wadhwani enrolment link + institute code are NEVER exposed on this public
// page — they live only in server code (src/lib/jobready.ts) and are sent by the
// team via WhatsApp/email, then shown in the logged-in Humrahi dashboard once the
// person is confirmed as a beneficiary in Seva Stack. Keep this file URL-free.
const HELPLINE = "917797707700";

// Both string sets hardcoded — no i18n lib (only two languages, one page).
const T = {
  bn: {
    switch: "English",
    kicker: "হামরাহি × ওয়াধওয়ানি ফাউন্ডেশন",
    title: "হামরাহি ভোর — ফ্রি স্কিলিং",
    pitch:
      "হামরাহি ভোর — ওয়াধওয়ানি জবরেডি দ্বারা পরিচালিত ফ্রি স্কিলিং — ১০টি ফ্রি কোর্স, সার্টিফিকেট + স্কিল স্কোরকার্ড, এবং কোর্স শেষ করলে জব কানেক্ট জব পোর্টাল খুলে যায়। হামরাহি এখানে আপনার স্থানীয় ট্রেনিং পার্টনার।",
    freeNote: "চিরকাল ফ্রি। কোনো চাকরির গ্যারান্টি নেই — আমরা সৎভাবে বলছি।",
    nameLabel: "পুরো নাম",
    namePh: "আপনার নাম",
    phoneLabel: "হোয়াটসঅ্যাপ নম্বর",
    phonePh: "১০-সংখ্যার মোবাইল নম্বর",
    phoneHint: "ভারতীয় মোবাইল নম্বর — +91 বা ১০ সংখ্যা",
    emailLabel: "ইমেল",
    emailReco: "সুপারিশ করা হচ্ছে — আপনার বেনিফিশিয়ারি ইনভাইট এখানেই আসবে",
    emailPh: "you@example.com",
    minorLabel: "আমার বয়স ১৮ বছরের কম",
    guardianLabel: "আমার অভিভাবক এই সাইন-আপে সম্মতি দিয়েছেন",
    submit: "রেজিস্টার করুন",
    submitting: "পাঠানো হচ্ছে…",
    required: "*",
    errName: "নাম লিখুন",
    errPhone: "সঠিক ভারতীয় মোবাইল নম্বর দিন",
    errGuardian: "নাবালকদের জন্য অভিভাবকের সম্মতি দরকার",
    errServer: "কিছু একটা সমস্যা হয়েছে — আবার চেষ্টা করুন",
    okTitle: "আপনি রেজিস্টার হয়ে গেছেন ✅",
    okDone:
      "স্টেপ ১ সম্পন্ন। আমাদের টিম হোয়াটসঅ্যাপ ও ইমেলে আপনার কোর্সের লিঙ্ক পাঠাবে, এবং আপনি আপনার হামরাহি অ্যাকাউন্টে সব কিছু ট্র্যাক করতে পারবেন।",
    alreadyTitle: "আপনি আগেই রেজিস্টার করেছেন ✅",
    alreadyDone:
      "এই নম্বরটি আগেই রেজিস্টার করা আছে। আমাদের টিম হোয়াটসঅ্যাপ/ইমেলে আপনার লিঙ্ক পাঠাবে — হামরাহি অ্যাকাউন্টে ট্র্যাক করুন।",
    getLink: "হোয়াটসঅ্যাপে আমাদের সাথে যোগাযোগ করুন",
    inviteSoon:
      "Seva Stack থেকে আপনার অফিসিয়াল বেনিফিশিয়ারি ইনভাইট শীঘ্রই ইমেলে পৌঁছে যাবে।",
    waText: (name: string) =>
      `হ্যালো হামরাহি! আমি ${name || "একজন"} হামরাহি ভোরের জন্য সাইন আপ করেছি। দয়া করে আমার এনরোলমেন্ট লিঙ্ক পাঠান।`,
  },
  en: {
    switch: "বাংলা",
    kicker: "Humrahi × Wadhwani Foundation",
    title: "Humrahi Bhor — free skilling",
    pitch:
      "Humrahi Bhor — free skilling powered by Wadhwani JobReady — 10 free courses, a certificate + Skill Scorecard, and the Job Connect job portal unlocks when you finish. Humrahi is your local training partner.",
    freeNote: "Free forever. No job guarantees — we tell you honestly.",
    nameLabel: "Full name",
    namePh: "Your name",
    phoneLabel: "WhatsApp number",
    phonePh: "10-digit mobile number",
    phoneHint: "Indian mobile — +91 or 10 digits",
    emailLabel: "Email",
    emailReco: "recommended — your beneficiary invite arrives here",
    emailPh: "you@example.com",
    minorLabel: "I am under 18",
    guardianLabel: "My parent/guardian consents to this sign-up",
    submit: "Register",
    submitting: "Sending…",
    required: "*",
    errName: "Please enter your name",
    errPhone: "Enter a valid Indian mobile number",
    errGuardian: "Guardian consent is required for minors",
    errServer: "Something went wrong — please try again",
    okTitle: "You're registered ✅",
    okDone:
      "Step 1 done. Our team will send your course links on WhatsApp and email, and you can track everything in your Humrahi account.",
    alreadyTitle: "You're already registered ✅",
    alreadyDone:
      "This number is already registered. Our team will send your links on WhatsApp/email — track them in your Humrahi account.",
    getLink: "Message us on WhatsApp",
    inviteSoon: "Your official beneficiary invite from Seva Stack will reach your email soon.",
    waText: (name: string) =>
      `Hi Humrahi! I just signed up for Humrahi Bhor as ${name || "a learner"}. Please send me my enrollment link.`,
  },
} as const;

// Client-side sanity check only — the API route is the real validator.
function looksLikeIndianMobile(raw: string): boolean {
  const d = raw.replace(/[\s-]/g, "");
  return /^(\+91)?[6-9]\d{9}$/.test(d);
}

export function JobReady() {
  const [lang, setLang] = useState<Lang>("bn"); // default Bangla
  const t = T[lang];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [company, setCompany] = useState(""); // honeypot — real users never see it

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { already: boolean; name: string }>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t.errName);
    if (!looksLikeIndianMobile(phone)) return setError(t.errPhone);
    if (isMinor && !guardianConsent) return setError(t.errGuardian);

    setSubmitting(true);
    try {
      const res = await fetch("/api/jobready-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim(),
          whatsapp_phone: phone.trim(),
          email: email.trim() || null,
          language: lang,
          is_minor: isMinor,
          guardian_consent: guardianConsent,
          company, // honeypot
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(t.errServer);
        return;
      }
      setDone({ already: !!data.alreadyRegistered, name: name.trim() });
    } catch {
      setError(t.errServer);
    } finally {
      setSubmitting(false);
    }
  }

  const waHref = `https://wa.me/${HELPLINE}?text=${encodeURIComponent(
    t.waText(done?.name ?? name)
  )}`;

  return (
    <main className="min-h-screen bg-cloud font-inter text-ink">
      <div className="mx-auto w-full max-w-md px-5 py-8">
        {/* Language toggle */}
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="rounded-full border border-taupe/60 bg-white px-3 py-1 text-sm text-soft transition-colors hover:border-ink"
          >
            {t.switch}
          </button>
        </div>

        {done ? (
          <section className="rounded-card border border-taupe/40 bg-white p-6 text-center shadow-card">
            <h1 className="font-lora text-2xl text-ink">
              {done.already ? t.alreadyTitle : t.okTitle}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-soft">
              {done.already ? t.alreadyDone : t.okDone}
            </p>

            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 block w-full rounded-card border border-taupe/60 bg-white px-5 py-3 text-center text-sm font-medium text-soft transition-colors hover:border-ink"
            >
              {t.getLink}
            </a>

            <p className="mt-5 text-xs leading-relaxed text-taupe-dark">{t.inviteSoon}</p>
          </section>
        ) : (
          <>
            <header className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-red">
                {t.kicker}
              </p>
              <h1 className="mt-1 font-lora text-3xl leading-tight text-ink">{t.title}</h1>
              <span className="mt-3 block h-0.5 w-10 bg-red" aria-hidden="true" />
              <p className="mt-4 text-sm leading-relaxed text-soft">{t.pitch}</p>
              <p className="mt-3 rounded-card bg-sand/60 px-4 py-3 text-xs font-medium text-ink">
                {t.freeNote}
              </p>
            </header>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <Field label={t.nameLabel} required requiredMark={t.required}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePh}
                  autoComplete="name"
                  className={inputCls}
                />
              </Field>

              <Field
                label={t.phoneLabel}
                required
                requiredMark={t.required}
                hint={t.phoneHint}
              >
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.phonePh}
                  autoComplete="tel"
                  className={inputCls}
                />
              </Field>

              <Field label={t.emailLabel} hint={t.emailReco}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPh}
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>

              {/* Honeypot — hidden from humans, catches bots. */}
              <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
                <label>
                  Company
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 text-sm text-soft">
                <input
                  type="checkbox"
                  checked={isMinor}
                  onChange={(e) => {
                    setIsMinor(e.target.checked);
                    if (!e.target.checked) setGuardianConsent(false);
                  }}
                  className="h-4 w-4 accent-red"
                />
                {t.minorLabel}
              </label>

              {isMinor && (
                <label className="flex items-start gap-3 rounded-card bg-sand/50 px-4 py-3 text-sm text-soft">
                  <input
                    type="checkbox"
                    checked={guardianConsent}
                    onChange={(e) => setGuardianConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-red"
                  />
                  {t.guardianLabel} {t.required}
                </label>
              )}

              {error && (
                <p className="rounded-card bg-red/10 px-4 py-2 text-sm text-red">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-card bg-red px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-crimson disabled:opacity-60"
              >
                {submitting ? t.submitting : t.submit}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-card border border-taupe/60 bg-white px-4 py-3 text-base text-ink placeholder:text-taupe outline-none transition-colors focus:border-red";

function Field({
  label,
  required,
  requiredMark,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  requiredMark?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-red">{requiredMark}</span>}
      </span>
      {hint && <span className="mb-1.5 block text-xs text-taupe-dark">{hint}</span>}
      {children}
    </label>
  );
}
