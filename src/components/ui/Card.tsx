import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "whisper" | "sand";
}

export function Card({ variant = "whisper", className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card shadow-card p-6",
        variant === "whisper" ? "bg-whisper" : "bg-sand",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-lora text-lg text-ink mb-1", className)} {...props}>
      {children}
    </h3>
  );
}

export function EyebrowLabel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("eyebrow mb-3", className)} {...props}>
      {children}
      <span className="red-rule" aria-hidden="true" />
    </p>
  );
}
