-- Citron — Client intake schema
-- Design principle: every content column is nullable. A submission with only an
-- email (or nothing at all) still lands in the table without failing. The full
-- original webhook body is always kept in `raw_payload` so we never lose data
-- if the Tally form changes shape later.

create extension if not exists "uuid-ossp";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'intake_status') then
    create type intake_status as enum (
      'new',
      'reviewed',
      'qualified',
      'converted',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'intake_budget_band') then
    create type intake_budget_band as enum (
      'under_5k',
      'band_5k_15k',
      'band_15k_50k',
      'band_50k_100k',
      'over_100k',
      'unknown'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'intake_timeline') then
    create type intake_timeline as enum (
      'asap',
      'lt_1_month',
      'within_1_3_months',
      'within_3_6_months',
      'flexible',
      'unknown'
    );
  end if;
end $$;

create table if not exists project_intakes (
  id                      uuid primary key default uuid_generate_v4(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- Source metadata
  source                  text not null default 'tally',
  external_submission_id  text unique,
  external_form_id        text,

  -- Decision maker / contact (all optional)
  contact_name            text,
  contact_email           text,
  contact_role            text,
  company_name            text,
  company_website         text,

  -- Project overview
  project_title           text,
  project_summary         text,
  project_type            text,

  -- Goals & vision
  goals                   text,
  success_metrics         text,
  vision                  text,
  inspiration_links       text[],

  -- Features
  must_have_features      text,
  nice_to_have_features   text,

  -- Branding / assets
  has_existing_brand      boolean,
  brand_notes             text,
  asset_urls              text[],

  -- Technical
  tech_preferences        text,
  integrations            text,
  hosting_preferences     text,

  -- Budget & timeline
  budget_band             intake_budget_band,
  budget_exact_amount     numeric(12, 2),
  budget_currency         text default 'USD',
  timeline                intake_timeline,
  timeline_notes          text,

  -- Open-ended
  open_notes              text,

  -- Processing layer (filled by the Edge Function)
  tags                    text[] not null default '{}',
  ai_summary              text,
  ai_model                text,
  ai_generated_at         timestamptz,

  -- Workflow
  status                  intake_status not null default 'new',
  assigned_to             text,
  internal_notes          text,

  -- Raw audit snapshot (never loses data)
  raw_payload             jsonb not null
);

create index if not exists project_intakes_created_at_idx
  on project_intakes (created_at desc);

create index if not exists project_intakes_status_idx
  on project_intakes (status);

create index if not exists project_intakes_tags_idx
  on project_intakes using gin (tags);

create index if not exists project_intakes_email_idx
  on project_intakes (contact_email);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists project_intakes_set_updated_at on project_intakes;
create trigger project_intakes_set_updated_at
before update on project_intakes
for each row execute function set_updated_at();

-- Row Level Security -------------------------------------------------------
-- Inserts come exclusively from the Edge Function running under service_role
-- (service_role bypasses RLS), so we only define policies for the authenticated
-- CRM users. No public INSERT policy exists => public clients cannot write.
alter table project_intakes enable row level security;

drop policy if exists "intakes_select_authenticated" on project_intakes;
create policy "intakes_select_authenticated"
  on project_intakes
  for select
  to authenticated
  using (true);

drop policy if exists "intakes_update_authenticated" on project_intakes;
create policy "intakes_update_authenticated"
  on project_intakes
  for update
  to authenticated
  using (true)
  with check (true);

-- Convenience view for quick dashboards
create or replace view project_intakes_summary as
select
  id,
  created_at,
  status,
  tags,
  coalesce(project_title, company_name, contact_email, 'Untitled intake') as display_title,
  contact_name,
  contact_email,
  company_name,
  budget_band,
  timeline,
  ai_summary
from project_intakes;
