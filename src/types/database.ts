// Supabase database types — generated manually from the migration schema.
// Run `supabase gen types typescript` after applying migrations to regenerate.

export type HumrahiRole = "humrahi" | "volunteer" | "drive_lead" | "admin";
export type DonationSource = "sevastack_api" | "sevastack_csv" | "manual" | "razorpay";
export type DriveType = "monthly_cohort" | "drive";
export type DriveStatus = "draft" | "active" | "closed";
export type EnquiryStatus = "New" | "Contacted" | "Active" | "Closed";
export type DataRequestType = "access" | "erasure";
export type DataRequestStatus = "pending" | "in_progress" | "resolved";

export interface Humrahi {
  id: string; // auth.uid()
  phone: string;
  first_name: string | null;
  display_name: string | null;
  city: string;
  role: HumrahiRole;
  consent_recognition: boolean;
  consent_marketing: boolean;
  joined_at: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  humrahi_id: string | null; // null until claimed
  donor_phone: string | null;
  donor_email: string | null;
  amount_inr: number;
  donated_at: string;
  designation: "meals" | "health" | "school" | "general";
  is_recurring: boolean;
  source: DonationSource;
  external_id: string; // unique — Sevastack receipt/txn id
  reconciled_at: string | null;
  raw: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ImpactRate {
  id: string;
  key: "meal_cost" | "camp_share" | "school_term";
  value_inr: number;
  effective_from: string;
  created_at: string;
}

export interface Drive {
  id: string;
  name: string;
  type: DriveType;
  description: string | null;
  city: string;
  goal_amount_inr: number | null;
  goal_meals: number | null;
  starts_at: string;
  ends_at: string | null;
  status: DriveStatus;
  created_at: string;
  updated_at: string;
}

export interface DriveParticipation {
  drive_id: string;
  humrahi_id: string;
  contributed_amount_inr: number;
  created_at: string;
}

export interface ImpactReveal {
  id: string;
  humrahi_id: string | null; // null = broadcast to all
  drive_id: string | null;
  photo_url: string | null;
  story_text: string;
  served_on: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enquiry {
  id: string;
  humrahi_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  interest: string | null;
  availability: string | null;
  message: string | null;
  status: EnquiryStatus;
  notes: string | null;
  source: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Consent {
  id: string;
  humrahi_id: string;
  type: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
}

export interface DataRequest {
  id: string;
  humrahi_id: string;
  type: DataRequestType;
  status: DataRequestStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

// Derived type for donor dashboard impact calculations
export interface DonorImpact {
  total_donated_inr: number;
  meals_funded: number;       // floor(meals_designation_total / meal_cost)
  camps_funded: number;       // floor(health_designation_total / camp_share)
  school_term_fraction: number; // health_designation_total / school_term cost, 0–1
  donation_count: number;
  first_donation_at: string | null;
}
