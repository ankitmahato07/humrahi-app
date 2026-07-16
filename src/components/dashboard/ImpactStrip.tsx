import { Card, EyebrowLabel } from "@/components/ui/Card";
import { ImpactRing } from "@/components/ui/ImpactRing";

interface ImpactStripProps {
  totalInr: number;
  mealsFunded: number;
  campsFunded: number;
  hasGiven: boolean;
}

// Panel B — Impact strip. Tour anchor "impact" lives on the wrapping
// <section> (not the Card component) — Card's prop type doesn't declare
// data-* attributes, and native elements are where TS allows them for free.
export function ImpactStrip({ totalInr, mealsFunded, campsFunded, hasGiven }: ImpactStripProps) {
  return (
    <section data-tour="impact" aria-label="Your impact">
      <Card>
        <EyebrowLabel>Your impact</EyebrowLabel>

        {!hasGiven ? (
          <div className="mt-4 text-center py-6">
            <p className="text-soft text-sm leading-relaxed max-w-xs mx-auto">
              Your journey starts here. Your first gift will show up as a meal, a health camp,
              a step forward in Siliguri.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-8 mt-4">
            <div className="flex gap-6 flex-wrap">
              {mealsFunded > 0 && (
                <ImpactRing
                  fraction={Math.min(mealsFunded / 312, 1)}
                  label={`≈${mealsFunded.toLocaleString("en-IN")} meals`}
                  sublabel="funded"
                />
              )}
              {campsFunded > 0 && (
                <ImpactRing
                  fraction={1}
                  label={`${campsFunded} health camp${campsFunded === 1 ? "" : "s"}`}
                  sublabel="contributed to"
                />
              )}
            </div>
            <div>
              <p className="eyebrow mb-1">Total given</p>
              <p className="font-lora text-3xl text-ink">
                ₹{totalInr.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-taupe-dark mt-4">
          ≈ approximate ·{" "}
          <a href="/how-we-count" className="underline hover:text-red transition-colors">
            how we count
          </a>
        </p>
      </Card>
    </section>
  );
}
