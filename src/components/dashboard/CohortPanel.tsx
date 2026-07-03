import { Card, EyebrowLabel } from "@/components/ui/Card";
import { DONATE_URL } from "@/lib/links";
import type { Drive } from "@/types/database";

interface CohortPanelProps {
  cohort: Drive | null;
  cohortStats: { humrahi_count: number; total_meals: number };
  drive: Drive | null;
  driveProgress: number; // 0–1
}

export function CohortPanel({ cohort, cohortStats, drive, driveProgress }: CohortPanelProps) {
  const currentMonth = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <Card variant="sand" aria-label="This month in Siliguri">
      <EyebrowLabel>This month in Siliguri</EyebrowLabel>

      {/* Monthly cohort belonging — collective framing, never individual ranking */}
      {cohort ? (
        <div className="mt-3">
          <p className="font-lora text-lg text-ink leading-snug">
            {cohortStats.humrahi_count > 0
              ? `${cohortStats.humrahi_count} Humrahi${cohortStats.humrahi_count === 1 ? "" : "s"} walked together this month.`
              : `The ${currentMonth} cohort is gathering.`}
          </p>
          {cohortStats.total_meals > 0 && (
            <p className="text-soft text-sm mt-1">
              Together: ≈{cohortStats.total_meals.toLocaleString("en-IN")} meals in Siliguri.{" "}
              <span className="text-ink font-medium">You're one of them.</span>
            </p>
          )}
          {cohort.description && (
            <p className="text-xs text-taupe-dark mt-2 leading-relaxed">{cohort.description}</p>
          )}
        </div>
      ) : (
        <p className="text-soft text-sm mt-3">
          The {currentMonth} cohort is forming. Your gift this month counts.
        </p>
      )}

      {/* Active drive progress — Pattern 1 completion pull, group level */}
      {drive && (
        <div className="mt-6">
          <p className="text-sm font-medium text-ink">{drive.name}</p>
          {drive.description && (
            <p className="text-xs text-soft mt-0.5 leading-relaxed">{drive.description}</p>
          )}

          {/* Progress bar */}
          <div
            className="mt-3 h-2.5 rounded-full overflow-hidden"
            style={{ background: "var(--taupe)", opacity: 0.4 }}
            role="progressbar"
            aria-valuenow={Math.round(driveProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${drive.name} progress: ${Math.round(driveProgress * 100)}%`}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round(driveProgress * 100)}%`,
                background: "var(--red)",
                opacity: 1,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-taupe-dark">
            <span>{Math.round(driveProgress * 100)}% there</span>
            {drive.ends_at && (
              <span>
                {Math.ceil(
                  (new Date(drive.ends_at).getTime() - Date.now()) / 86400000
                )}{" "}
                days left
              </span>
            )}
          </div>

          {driveProgress < 1 && (
            <a
              href={DONATE_URL}
              className="mt-3 inline-block text-xs font-medium text-red underline hover:text-crimson transition-colors"
            >
              Help close it
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
