import { Card, EyebrowLabel } from "@/components/ui/Card";
import type { ImpactReveal } from "@/types/database";

// Panel D (a) — the latest published impact reveal story, if any.
export function LatestReveal({ reveal }: { reveal: ImpactReveal }) {
  return (
    <Card aria-label="Latest from the ground">
      <EyebrowLabel>From the ground</EyebrowLabel>
      <p className="text-ink text-sm leading-relaxed mt-2">{reveal.story_text}</p>
      {reveal.served_on && (
        <p className="text-xs text-taupe-dark mt-1">
          {new Date(reveal.served_on).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      )}
      {reveal.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element -- remote Supabase storage URL, no known dimensions
        <img
          src={reveal.photo_url}
          alt="Impact from Humrahi's work"
          className="mt-3 rounded-lg w-full object-cover max-h-56"
          loading="lazy"
        />
      )}
    </Card>
  );
}
