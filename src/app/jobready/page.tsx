import type { Metadata } from "next";
import { JobReady } from "./JobReady";

export const metadata: Metadata = {
  title: "Humrahi Bhor — free skilling, powered by Wadhwani JobReady",
  description:
    "Sign up with Humrahi Bhor for free skilling, powered by Wadhwani JobReady — 10 free courses, a certificate + Skill Scorecard, and Job Connect. Free forever, no job guarantees.",
};

export default function JobReadyPage() {
  return <JobReady />;
}
