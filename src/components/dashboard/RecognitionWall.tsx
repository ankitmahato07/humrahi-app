import Link from "next/link";
import { Card, EyebrowLabel } from "@/components/ui/Card";

interface RecognitionWallProps {
  names: (string | null)[];
  userConsented: boolean;
}

export function RecognitionWall({ names, userConsented }: RecognitionWallProps) {
  const validNames = names.filter(Boolean) as string[];

  return (
    <Card aria-label="Humrahis this month">
      <EyebrowLabel>Humrahis this month</EyebrowLabel>

      {validNames.length > 0 ? (
        <p className="text-soft text-sm leading-relaxed mt-2">
          {validNames.join(" · ")}
          {validNames.length >= 20 && " · and more…"}
        </p>
      ) : (
        <p className="text-soft text-sm mt-2 leading-relaxed">
          The wall fills as Humrahis opt in to be named. Be the first this month.
        </p>
      )}

      <p className="text-xs text-taupe-dark mt-4">
        First names only · opt-in · never ranked ·{" "}
        {userConsented ? (
          <Link href="/account#recognition" className="underline hover:text-red transition-colors">
            change your preference
          </Link>
        ) : (
          <Link href="/account#recognition" className="underline hover:text-red transition-colors">
            add your name
          </Link>
        )}
      </p>
    </Card>
  );
}
