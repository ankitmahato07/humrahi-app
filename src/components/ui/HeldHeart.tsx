// Held-Heart sub-mark — the Humrahi brand icon for the app.
// Uses inline SVG derived from the brand guide's sub-mark concept.
// The hands-cupping-a-heart motif; Sindoor Red (#BB1C2A).

import { cn } from "@/lib/utils/cn";

interface HeldHeartProps {
  size?: number;
  className?: string;
}

export function HeldHeart({ size = 32, className }: HeldHeartProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Humrahi"
      className={cn(className)}
    >
      {/* Simplified heart path */}
      <path
        d="M16 26s-10-6.5-10-13a6 6 0 0 1 10-4.47A6 6 0 0 1 26 13c0 6.5-10 13-10 13z"
        fill="#BB1C2A"
      />
      {/* Cupping hands — abstract arcs */}
      <path
        d="M5 22 C3 20, 2 17, 3 14"
        stroke="#BB1C2A"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M27 22 C29 20, 30 17, 29 14"
        stroke="#BB1C2A"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
