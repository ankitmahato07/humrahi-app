import type { Metadata } from "next";
import { JobReady } from "./JobReady";

export const metadata: Metadata = {
  title: "Free JobReady skilling — Humrahi × Wadhwani Foundation",
  description:
    "Sign up with Humrahi for free JobReady skilling by Wadhwani Foundation — 10 free courses, a certificate + Skill Scorecard, and Job Connect. Free forever, no job guarantees.",
};

export default function JobReadyPage() {
  return <JobReady />;
}
