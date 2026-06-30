import type { Humrahi, Donation, ImpactRate, Drive, ImpactReveal } from "@/types/database";
import { calculateImpact, formatMonthYear } from "@/lib/utils/impact";
import { IdentityStrip } from "./IdentityStrip";
import { ImpactPanel } from "./ImpactPanel";
import { CohortPanel } from "./CohortPanel";
import { WalkFurther } from "./WalkFurther";
import { RecognitionWall } from "./RecognitionWall";

interface DashboardShellProps {
  profile: Humrahi;
  donations: Pick<Donation, "amount_inr" | "designation" | "donated_at">[];
  rates: ImpactRate[];
  cohort: Drive | null;
  cohortStats: { humrahi_count: number; total_meals: number };
  drive: Drive | null;
  driveProgress: number;
  reveals: ImpactReveal[];
  recognitionNames: string[];
}

export function DashboardShell({
  profile,
  donations,
  rates,
  cohort,
  cohortStats,
  drive,
  driveProgress,
  reveals,
  recognitionNames,
}: DashboardShellProps) {
  const impact = calculateImpact(donations, rates);
  const sinceMonth = impact.first_donation_at
    ? formatMonthYear(impact.first_donation_at)
    : null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Panel A — Identity */}
      <IdentityStrip
        firstName={profile.first_name ?? ""}
        city={profile.city}
        sinceMonth={sinceMonth}
        joinedAt={profile.joined_at}
      />

      {/* Panels B + C — Impact + This month */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImpactPanel impact={impact} reveals={reveals} />
        <CohortPanel
          cohort={cohort}
          cohortStats={cohortStats}
          drive={drive}
          driveProgress={driveProgress}
        />
      </div>

      {/* Panel D — Walk further */}
      <WalkFurther />

      {/* Panel E — Recognition */}
      <RecognitionWall names={recognitionNames} userConsented={profile.consent_recognition} />
    </main>
  );
}
