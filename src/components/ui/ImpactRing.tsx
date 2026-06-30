"use client";

import { cn } from "@/lib/utils/cn";

interface ImpactRingProps {
  /** 0–1 fraction of completion */
  fraction: number;
  label: string;
  sublabel?: string;
  size?: number;
  className?: string;
}

// SVG completion ring inspired by the strategy doc's Pattern 5.
// Uses Gestalt closure — a ring that's not quite full invites the viewer to complete it.
export function ImpactRing({
  fraction,
  label,
  sublabel,
  size = 96,
  className,
}: ImpactRingProps) {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      role="img"
      aria-label={`${label}: ≈${Math.round(clamped * 100)}% funded`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        {/* Track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--sand)"
          strokeWidth={6}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--red)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </svg>
      <div className="text-center">
        <p className="text-sm font-inter font-medium text-ink leading-tight">{label}</p>
        {sublabel && (
          <p className="text-xs text-soft mt-0.5">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
