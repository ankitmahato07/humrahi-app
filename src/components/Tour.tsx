"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    target: '[data-tour="impact"]',
    title: "This is the difference you've made",
    body: "Meals funded, camps supported — every gift adds up here.",
  },
  {
    target: '[data-tour="campaigns"]',
    title: "See what we're working on right now",
    body: "Live campaigns in Siliguri, and how close each one is to its goal.",
  },
  {
    target: '[data-tour="giving-nav"]',
    title: "Your history and 80G receipts live here",
    body: "Download anytime. And when you're ready to walk further, your next gift goes straight to the ground.",
  },
] as const;

const STORAGE_KEY = "humrahi_tour_done";
const MOBILE_BREAKPOINT = 560;

// First-login product tour — 3 coachmarks, no library. Fires once per
// profile (profiles.tour_done_at null) with a localStorage guard so it
// can't refire in the gap before that write revalidates.
export function Tour({ tourDone }: { tourDone: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tourDone) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    setOpen(true);
  }, [tourDone]);

  // Track the current step's target position, scrolling it into view first.
  useEffect(() => {
    if (!open) return;
    const target = document.querySelector(STEPS[step].target);
    if (target instanceof HTMLElement) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
    const measure = () => {
      const el = document.querySelector(STEPS[step].target);
      setRect(el instanceof HTMLElement ? el.getBoundingClientRect() : null);
    };
    const settleTimer = window.setTimeout(measure, 260);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  // ESC to dismiss, Tab trapped inside the two panel buttons.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>("button");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish/next are stable closures over step/setOpen
  }, [open, step]);

  function finish() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private-mode storage etc. — harmless; the server write below still
      // lands, so the tour won't refire once the profile revalidates.
    }
    fetch("/api/tour/done", { method: "POST" }).catch(() => {});
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  }

  if (!open) return null;

  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  // ponytail: mobile always uses the bottom-sheet layout rather than trying
  // to spotlight a nav item that may be tucked inside a closed drawer —
  // simplest reliable fallback. Upgrade to a drawer-aware anchor only if
  // that gap is ever a real problem in practice.
  const showSpotlight = !isMobile && rect !== null && rect.width > 0 && rect.height > 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { title, body } = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const transitionClass = reduceMotion ? "" : "transition-all duration-300";

  return (
    <>
      <div className="fixed inset-0 bg-ink/55 z-40" onClick={finish} aria-hidden="true" />

      {showSpotlight && rect && (
        <div
          className={`fixed z-40 rounded-md border-2 border-red pointer-events-none ${transitionClass}`}
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
          aria-hidden="true"
        />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        className={
          showSpotlight
            ? `fixed z-50 bg-whisper border border-sand rounded-card shadow-card-hover p-5 max-w-sm ${transitionClass}`
            : `fixed z-50 inset-x-3 bottom-3 bg-whisper border border-sand rounded-card shadow-card-hover p-5 ${transitionClass}`
        }
        style={
          showSpotlight && rect
            ? {
                top: Math.min(rect.bottom + 16, window.innerHeight - 200),
                left: Math.max(12, Math.min(rect.left, window.innerWidth - 340)),
              }
            : undefined
        }
      >
        <p className="eyebrow mb-2">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="tour-title" className="font-lora text-lg text-ink mb-1.5">
          {title}
        </h2>
        <p id="tour-body" className="text-soft text-sm leading-relaxed mb-4">
          {body}
        </p>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-xs font-medium text-taupe-dark hover:text-red transition-colors"
          >
            Skip
          </button>
          <button type="button" onClick={next} className="btn-red">
            {isLast ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
