import Link from "next/link";
import { EyebrowLabel } from "@/components/ui/Card";
import type { Drive } from "@/types/database";

interface CampaignsPreviewProps {
  drives: Drive[];
  raisedByDrive: Record<string, number>;
}

// Panel C — up to 3 campaign cards + "All campaigns →". Tour anchor
// "campaigns" on the wrapping <section> (see ImpactStrip for why).
export function CampaignsPreview({ drives, raisedByDrive }: CampaignsPreviewProps) {
  const preview = drives.slice(0, 3);

  return (
    <section data-tour="campaigns" aria-label="What we're working on">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <EyebrowLabel className="mb-0">What we&apos;re working on</EyebrowLabel>
        <Link
          href="/campaigns"
          className="text-sm font-medium text-red hover:text-crimson transition-colors"
        >
          All campaigns →
        </Link>
      </div>

      {preview.length === 0 ? (
        <div className="card">
          <p className="text-soft text-sm">
            Nothing active right now — check back soon, or see our ongoing work.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {preview.map((drive) => {
            const raised = raisedByDrive[drive.id] ?? 0;
            const fraction = drive.goal_amount_inr
              ? Math.min(raised / drive.goal_amount_inr, 1)
              : 0;
            return (
              <Link
                key={drive.id}
                href={`/campaigns/${drive.id}`}
                className="card group block hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
              >
                <h3 className="font-lora text-base text-ink mb-1 group-hover:text-red transition-colors">
                  {drive.name}
                </h3>
                {drive.description && (
                  <p className="text-xs text-soft leading-relaxed mb-3 line-clamp-2">
                    {drive.description}
                  </p>
                )}
                {drive.goal_amount_inr && (
                  <div className="h-1.5 rounded-full overflow-hidden bg-sand">
                    <div
                      className="h-full bg-red rounded-full"
                      style={{ width: `${Math.round(fraction * 100)}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
