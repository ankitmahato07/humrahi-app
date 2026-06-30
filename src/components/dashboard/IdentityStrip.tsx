import { HeldHeart } from "@/components/ui/HeldHeart";

interface IdentityStripProps {
  firstName: string;
  city: string;
  sinceMonth: string | null;
  joinedAt: string;
}

export function IdentityStrip({ firstName, city, sinceMonth, joinedAt }: IdentityStripProps) {
  const joinedMonthYear = new Date(joinedAt).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <section aria-label="Your identity" className="flex items-start gap-4">
      <div className="flex-shrink-0 mt-1">
        <HeldHeart size={36} />
      </div>
      <div>
        <h2 className="font-lora text-2xl sm:text-3xl text-ink leading-snug">
          You walk with us, {firstName}.
        </h2>
        <p className="text-soft text-sm mt-1">
          A Humrahi since {sinceMonth ?? joinedMonthYear} · {city}
        </p>
        <span className="block w-10 h-0.5 mt-3 bg-red" aria-hidden="true" />
      </div>
    </section>
  );
}
