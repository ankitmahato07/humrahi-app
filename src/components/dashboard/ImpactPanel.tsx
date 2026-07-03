import { Card, EyebrowLabel } from "@/components/ui/Card";
import { ImpactRing } from "@/components/ui/ImpactRing";
import type { DonorImpact, ImpactReveal } from "@/types/database";
import { DONATE_URL } from "@/lib/links";
import Link from "next/link";

interface ImpactPanelProps {
  impact: DonorImpact;
  reveals: ImpactReveal[];
}

export function ImpactPanel({ impact, reveals }: ImpactPanelProps) {
  const hasAnyImpact = impact.donation_count > 0;

  return (
    <Card aria-label="Your impact">
      <EyebrowLabel>Your impact</EyebrowLabel>

      {!hasAnyImpact ? (
        <EmptyImpactState />
      ) : (
        <>
          {/* Impact rings — completion drives from Pattern 5 */}
          <div className="flex gap-6 flex-wrap mt-4 mb-5">
            {impact.meals_funded > 0 && (
              <ImpactRing
                fraction={Math.min(impact.meals_funded / 312, 1)}
                label={`≈${impact.meals_funded} meals`}
                sublabel="funded"
              />
            )}
            {impact.camps_funded > 0 && (
              <ImpactRing
                fraction={1}
                label={`${impact.camps_funded} health camp${impact.camps_funded > 1 ? "s" : ""}`}
                sublabel="contributed to"
              />
            )}
            {impact.school_term_fraction > 0 && (
              <ImpactRing
                fraction={impact.school_term_fraction}
                label="School term"
                sublabel={
                  impact.school_term_fraction >= 1
                    ? "fully funded"
                    : `${Math.round(impact.school_term_fraction * 100)}% funded`
                }
              />
            )}
          </div>

          {/* School-term completion invite — one calm nudge */}
          {impact.school_term_fraction > 0 && impact.school_term_fraction < 1 && (
            <p className="text-xs text-soft mt-1 mb-4 leading-relaxed">
              Want to complete this term?{" "}
              <a
                href={DONATE_URL}
                className="underline text-red hover:text-crimson transition-colors"
              >
                Give again
              </a>
            </p>
          )}

          {/* Impact reveals — Pattern 4: the honest, anticipated reveal */}
          {reveals.length > 0 && (
            <div className="space-y-3 mt-2">
              {reveals.map((reveal) => (
                <div key={reveal.id} className="border-l-2 pl-3" style={{ borderColor: "var(--red)" }}>
                  <p className="text-sm text-ink leading-relaxed">{reveal.story_text}</p>
                  {reveal.served_on && (
                    <p className="text-xs text-taupe-dark mt-0.5">
                      {new Date(reveal.served_on).toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  )}
                  {reveal.photo_url && (
                    <img
                      src={reveal.photo_url}
                      alt="Impact from Humrahi kitchen"
                      className="mt-2 rounded-lg w-full object-cover max-h-40"
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-taupe-dark mt-4">
            ≈ approximate ·{" "}
            <Link href="/how-we-count" className="underline hover:text-red transition-colors">
              how we count
            </Link>
          </p>
        </>
      )}
    </Card>
  );
}

function EmptyImpactState() {
  return (
    <div className="mt-4 text-center py-6">
      <p className="text-soft text-sm leading-relaxed max-w-xs mx-auto">
        Your impact story starts with your first gift. The kitchen opens at 6.
      </p>
      <a
        href={DONATE_URL}
        className="btn-red mt-4 inline-flex"
      >
        Give your first gift
      </a>
      <p className="text-xs text-taupe-dark mt-4">
        Already gave before signing in?{" "}
        <Link href="/claim" className="underline hover:text-red transition-colors">
          Claim your gift
        </Link>
      </p>
    </div>
  );
}
