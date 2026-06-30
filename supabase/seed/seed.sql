-- ============================================================
-- Seed data for local development
-- Run AFTER migrations. Uses placeholder UUIDs — never run in production.
-- ============================================================

-- Impact rates (FY 2026)
insert into impact_rates (key, value_inr, effective_from) values
  ('meal_cost',    45,    '2026-04-01'),
  ('camp_share',   2500,  '2026-04-01'),
  ('school_term',  12000, '2026-04-01')
on conflict (key, effective_from) do nothing;

-- Sample active monthly cohort — June 2026
insert into drives (id, name, type, description, city, goal_amount_inr, goal_meals, starts_at, ends_at, status)
values (
  'a1000000-0000-0000-0000-000000000001',
  'Siliguri June 2026',
  'monthly_cohort',
  'This month, 41 Humrahis are feeding families across Siliguri together.',
  'Siliguri',
  60000,
  1333,
  '2026-06-01T00:00:00Z',
  '2026-06-30T23:59:59Z',
  'active'
) on conflict (id) do nothing;

-- Sample active drive
insert into drives (id, name, type, description, city, goal_amount_inr, starts_at, ends_at, status)
values (
  'a1000000-0000-0000-0000-000000000002',
  'Winter Blanket Drive 2026',
  'drive',
  'Warm blankets for families in the Siliguri tea-garden belt before the cold season.',
  'Siliguri',
  120000,
  '2026-06-01T00:00:00Z',
  '2026-09-30T23:59:59Z',
  'active'
) on conflict (id) do nothing;

-- Sample broadcast impact reveal
insert into impact_reveals (story_text, served_on, published_at)
values (
  'Your gift became part of Tuesday''s 312 plates — the hospital meals programme, Siliguri District Hospital.',
  '2026-06-17',
  '2026-06-18T08:00:00Z'
) on conflict do nothing;

-- CMS defaults — donation tiers matching donate.html
insert into cms_content (key, value, published) values
(
  'donation_tiers',
  '[
    {"amount": 500,  "label": "A warm meal", "description": "≈11 warm meals for one family"},
    {"amount": 2500, "label": "A week of nourishment", "description": "≈55 meals across a week"},
    {"amount": 5000, "label": "A month of care",       "description": "≈111 meals and more"}
  ]'::jsonb,
  true
),
(
  'impact_stats',
  '{
    "meals_served": "1,20,000+",
    "lives_touched": "5,000+",
    "drives_done": "50+"
  }'::jsonb,
  true
)
on conflict (key) do update set value = excluded.value, published = excluded.published;
