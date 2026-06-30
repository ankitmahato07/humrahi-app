-- ============================================================
-- Humrahi App — Initial Schema
-- Apply via: supabase db push  or  psql < migrations/001_schema.sql
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- ────────────────────────────────────────────────────────────
-- ENUM types
-- ────────────────────────────────────────────────────────────
create type humrahi_role as enum ('humrahi', 'volunteer', 'drive_lead', 'admin');
create type donation_source as enum ('sevastack_api', 'sevastack_csv', 'manual');
create type drive_type as enum ('monthly_cohort', 'drive');
create type drive_status as enum ('draft', 'active', 'closed');
create type enquiry_status as enum ('New', 'Contacted', 'Active', 'Closed');
create type data_request_type as enum ('access', 'erasure');
create type data_request_status as enum ('pending', 'in_progress', 'resolved');
create type impact_rate_key as enum ('meal_cost', 'camp_share', 'school_term');
create type donation_designation as enum ('meals', 'health', 'school', 'general');

-- ────────────────────────────────────────────────────────────
-- humrahis
-- ────────────────────────────────────────────────────────────
create table if not exists humrahis (
  id                  uuid primary key references auth.users(id) on delete cascade,
  phone               text not null unique,
  first_name          text,
  display_name        text,
  city                text not null default 'Siliguri',
  role                humrahi_role not null default 'humrahi',
  consent_recognition boolean not null default false,
  consent_marketing   boolean not null default false,
  joined_at           timestamptz not null default now(),
  avatar_url          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- donations (synced from Sevastack — never client-inserted)
-- ────────────────────────────────────────────────────────────
create table if not exists donations (
  id            uuid primary key default gen_random_uuid(),
  humrahi_id    uuid references humrahis(id) on delete set null,
  donor_phone   text,
  donor_email   text,
  amount_inr    numeric(12,2) not null check (amount_inr > 0),
  donated_at    timestamptz not null,
  designation   donation_designation not null default 'general',
  is_recurring  boolean not null default false,
  source        donation_source not null,
  external_id   text not null unique,   -- Sevastack receipt / txn id; idempotency key
  reconciled_at timestamptz,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists donations_humrahi_id_idx on donations(humrahi_id);
create index if not exists donations_donor_phone_idx on donations(donor_phone);
create index if not exists donations_donated_at_idx on donations(donated_at desc);

-- ────────────────────────────────────────────────────────────
-- impact_rates (admin-managed, versioned)
-- ────────────────────────────────────────────────────────────
create table if not exists impact_rates (
  id             uuid primary key default gen_random_uuid(),
  key            impact_rate_key not null,
  value_inr      numeric(12,2) not null check (value_inr > 0),
  effective_from date not null default current_date,
  created_at     timestamptz not null default now(),
  unique (key, effective_from)
);

-- ────────────────────────────────────────────────────────────
-- drives (monthly cohorts + specific drives)
-- ────────────────────────────────────────────────────────────
create table if not exists drives (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  type            drive_type not null,
  description     text,
  city            text not null default 'Siliguri',
  goal_amount_inr numeric(12,2),
  goal_meals      integer,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  status          drive_status not null default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- drive_participation
-- ────────────────────────────────────────────────────────────
create table if not exists drive_participation (
  drive_id                uuid not null references drives(id) on delete cascade,
  humrahi_id              uuid not null references humrahis(id) on delete cascade,
  contributed_amount_inr  numeric(12,2) not null default 0,
  created_at              timestamptz not null default now(),
  primary key (drive_id, humrahi_id)
);

-- ────────────────────────────────────────────────────────────
-- impact_reveals (the "your gift became Tuesday's plates" moments)
-- ────────────────────────────────────────────────────────────
create table if not exists impact_reveals (
  id           uuid primary key default gen_random_uuid(),
  humrahi_id   uuid references humrahis(id) on delete set null,  -- null = broadcast
  drive_id     uuid references drives(id) on delete set null,
  photo_url    text,
  story_text   text not null,
  served_on    date,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- enquiries (volunteer + contact CRM)
-- ────────────────────────────────────────────────────────────
create table if not exists enquiries (
  id          uuid primary key default gen_random_uuid(),
  humrahi_id  uuid references humrahis(id) on delete set null,
  name        text not null,
  phone       text,
  email       text,
  interest    text,
  availability text,
  message     text,
  status      enquiry_status not null default 'New',
  notes       text,
  source      text,
  assigned_to uuid references humrahis(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- cms_content (settings.json source of truth)
-- ────────────────────────────────────────────────────────────
create table if not exists cms_content (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,
  value        jsonb not null,
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- consents (DPDP per-type audit trail)
-- ────────────────────────────────────────────────────────────
create table if not exists consents (
  id          uuid primary key default gen_random_uuid(),
  humrahi_id  uuid not null references humrahis(id) on delete cascade,
  type        text not null,          -- 'recognition' | 'marketing' | …
  granted     boolean not null,
  granted_at  timestamptz,
  revoked_at  timestamptz,
  unique (humrahi_id, type)
);

-- ────────────────────────────────────────────────────────────
-- data_requests (DPDP access / erasure queue)
-- ────────────────────────────────────────────────────────────
create table if not exists data_requests (
  id           uuid primary key default gen_random_uuid(),
  humrahi_id   uuid not null references humrahis(id) on delete cascade,
  type         data_request_type not null,
  status       data_request_status not null default 'pending',
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- ────────────────────────────────────────────────────────────
-- audit_log (immutable append-only log of admin actions on donor data)
-- ────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid not null,  -- the admin who performed the action
  action     text not null,  -- e.g. 'update_enquiry_status', 'view_donor_profile'
  entity     text not null,  -- e.g. 'enquiries', 'humrahis', 'donations'
  entity_id  text not null,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);

-- audit_log is append-only — no updates or deletes
create index if not exists audit_log_actor_idx on audit_log(actor_id);
create index if not exists audit_log_entity_idx on audit_log(entity, entity_id);
create index if not exists audit_log_created_at_idx on audit_log(created_at desc);

-- ────────────────────────────────────────────────────────────
-- updated_at trigger helper
-- ────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger humrahis_updated_at before update on humrahis for each row execute function set_updated_at();
create or replace trigger donations_updated_at before update on donations for each row execute function set_updated_at();
create or replace trigger drives_updated_at before update on drives for each row execute function set_updated_at();
create or replace trigger impact_reveals_updated_at before update on impact_reveals for each row execute function set_updated_at();
create or replace trigger enquiries_updated_at before update on enquiries for each row execute function set_updated_at();
create or replace trigger cms_content_updated_at before update on cms_content for each row execute function set_updated_at();
