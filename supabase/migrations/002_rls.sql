-- ============================================================
-- Humrahi App — Row Level Security Policies
-- Default deny on all tables; explicit grants below.
-- ============================================================

-- ── humrahis ─────────────────────────────────────────────────
alter table humrahis enable row level security;

-- Donors read and update only their own row
create policy "humrahis: self read"
  on humrahis for select
  using (auth.uid() = id);

create policy "humrahis: self update"
  on humrahis for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Signed-in users can insert their own row (on profile creation)
create policy "humrahis: self insert"
  on humrahis for insert
  with check (auth.uid() = id);

-- Admin reads all
create policy "humrahis: admin read all"
  on humrahis for select
  using ((auth.jwt() ->> 'role') = 'admin');

create policy "humrahis: admin update all"
  on humrahis for update
  using ((auth.jwt() ->> 'role') = 'admin');

-- Recognition wall — signed-in users can see consented first names
create policy "humrahis: public recognition wall"
  on humrahis for select
  using (consent_recognition = true);

-- ── donations ────────────────────────────────────────────────
alter table donations enable row level security;

-- Donors read only their own donations
create policy "donations: donor read own"
  on donations for select
  using (humrahi_id = auth.uid());

-- No client-side inserts — all inserts via service-role (sync/admin)
-- Admin reads all
create policy "donations: admin read all"
  on donations for select
  using ((auth.jwt() ->> 'role') = 'admin');

-- ── impact_rates ─────────────────────────────────────────────
alter table impact_rates enable row level security;

-- Public read (needed to calculate impact without RPC)
create policy "impact_rates: public read"
  on impact_rates for select
  using (true);

-- Admin write
create policy "impact_rates: admin write"
  on impact_rates for all
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ── drives ───────────────────────────────────────────────────
alter table drives enable row level security;

-- Published drives are publicly readable
create policy "drives: public read active"
  on drives for select
  using (status = 'active' or (auth.jwt() ->> 'role') = 'admin');

-- Admin full control
create policy "drives: admin write"
  on drives for all
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ── drive_participation ──────────────────────────────────────
alter table drive_participation enable row level security;

-- Donors read own participation
create policy "drive_participation: donor read own"
  on drive_participation for select
  using (humrahi_id = auth.uid());

-- Server-side only inserts (via service role or server action)
-- Admin reads all for aggregate stats
create policy "drive_participation: admin read all"
  on drive_participation for select
  using ((auth.jwt() ->> 'role') = 'admin');

-- ── impact_reveals ───────────────────────────────────────────
alter table impact_reveals enable row level security;

-- Published reveals visible to the named donor (or broadcast = humrahi_id is null)
create policy "impact_reveals: donor read"
  on impact_reveals for select
  using (
    published_at is not null
    and (humrahi_id = auth.uid() or humrahi_id is null)
  );

-- Admin full control
create policy "impact_reveals: admin write"
  on impact_reveals for all
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ── enquiries ────────────────────────────────────────────────
alter table enquiries enable row level security;

-- Authenticated users can insert their own enquiry
create policy "enquiries: public insert"
  on enquiries for insert
  with check (true);

-- Admin only for reads and updates
create policy "enquiries: admin all"
  on enquiries for all
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ── cms_content ──────────────────────────────────────────────
alter table cms_content enable row level security;

-- Published content is publicly readable
create policy "cms_content: public read published"
  on cms_content for select
  using (published = true);

-- Admin full control
create policy "cms_content: admin all"
  on cms_content for all
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ── consents ─────────────────────────────────────────────────
alter table consents enable row level security;

create policy "consents: self read"
  on consents for select
  using (humrahi_id = auth.uid());

create policy "consents: self write"
  on consents for all
  using (humrahi_id = auth.uid())
  with check (humrahi_id = auth.uid());

create policy "consents: admin read all"
  on consents for select
  using ((auth.jwt() ->> 'role') = 'admin');

-- ── data_requests ─────────────────────────────────────────────
alter table data_requests enable row level security;

create policy "data_requests: self insert"
  on data_requests for insert
  with check (humrahi_id = auth.uid());

create policy "data_requests: self read"
  on data_requests for select
  using (humrahi_id = auth.uid());

create policy "data_requests: admin all"
  on data_requests for all
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ── audit_log ────────────────────────────────────────────────
alter table audit_log enable row level security;

-- Admin read only — no update/delete ever
create policy "audit_log: admin read"
  on audit_log for select
  using ((auth.jwt() ->> 'role') = 'admin');

-- Insert via service role only (server actions / sync — no client insert)
